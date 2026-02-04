# Fase 1 - Day 2: Type Definitions & Job Queue

**Fase:** 1 - Core Library  
**Dia:** 2  
**Status:** Pronto para implementação  
**Tempo estimado:** 6-8 horas

---

## Objetivo

Definir todas as interfaces TypeScript e implementar o `JobManager` com fila in-memory, TTL e cleanup automático.

---

## Tarefas

### 2.1 Definir Interfaces TypeScript
- [ ] Criar tipos base (`JobStatus`, `Message`, `Job`)
- [ ] Criar interfaces de resultado (`JobResult`)
- [ ] Criar interfaces de configuração (`ServerOptions`)
- [ ] Criar interfaces de resposta da API (`ExecuteResponse`, `JobStatusResponse`, `HealthResponse`)
- [ ] Definir interface `IGraphEngine` (contrato mínimo com SDK)

### 2.2 Implementar JobManager
- [ ] Criar classe `JobManager` estendendo `EventEmitter`
- [ ] Implementar fila in-memory com controle de concorrência
- [ ] Implementar sistema de TTL e cleanup automático
- [ ] Implementar estatísticas e posição na fila
- [ ] Adicionar eventos (`job:queued`, `job:started`, `job:completed`, `job:available`)

### 2.3 Testes Unitários
- [ ] Testar criação de jobs
- [ ] Testar transições de status
- [ ] Testar limite da fila
- [ ] Testar cleanup automático
- [ ] Testar estatísticas

---

## Arquivos a Criar

### src/types/index.ts
```typescript
/**
 * Types for Frame Agent Server
 * 
 * NOTA: O server NÃO depende de tipos do SDK.
 * Define seus próprios tipos mínimos para desacoplamento.
 */

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Job {
  id: string;
  messages: Message[];
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: JobResult;
  error?: string;
}

export interface JobResult {
  content: string | null;
  messages: Message[];
  success: boolean;
  error?: string;
  metadata?: {
    executionTime: number;
    startTime: Date;
    endTime: Date;
    tokensUsed?: number;
    cost?: number;
    [key: string]: any;
  };
}

export interface ServerOptions {
  port?: number;
  workers?: number;
  jobTTL?: number;
  maxQueueSize?: number;
  requestTimeout?: number;
  shutdownTimeout?: number;
}

export interface ExecuteResponse {
  jobId: string;
  status: JobStatus;
  position: number;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  result?: JobResult;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  stats: {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
    workers: number;
    availableWorkers: number;
  };
}

/**
 * Interface que o GraphEngine deve implementar (contrato mínimo)
 * O server não importa o SDK diretamente nos tipos - apenas no runtime
 */
export interface IGraphEngine {
  execute(initialState: { 
    messages: Message[]; 
    data?: any; 
    metadata?: any 
  }): Promise<{
    state: { 
      messages: Message[]; 
      data?: any; 
      metadata?: any 
    };
    status: string;
  }>;
}
```

### src/manager/JobManager.ts
```typescript
import { EventEmitter } from 'events';
import { Job, JobStatus, JobResult, Message } from '../types';

export interface JobManagerStats {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export interface JobManagerOptions {
  ttlMs: number;
  cleanupIntervalMs: number;
  maxQueueSize: number;
}

/**
 * Gerenciador de jobs com fila in-memory
 * 
 * Responsabilidades:
 * - Gerenciar fila de jobs
 * - Controlar concorrência
 * - Gerenciar TTL e cleanup
 * - Emitir eventos para integração com WorkerPool
 */
export class JobManager extends EventEmitter {
  private jobs = new Map<string, Job>();
  private queue: string[] = [];
  private running = new Set<string>();
  private maxConcurrent: number;
  private maxQueueSize: number;
  private ttlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxConcurrent: number = 4, options: JobManagerOptions) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = options.maxQueueSize;
    this.ttlMs = options.ttlMs;
    this.startCleanup(options.cleanupIntervalMs);
  }

  /**
   * Adiciona um novo job à fila
   * @throws Error se a fila estiver cheia
   */
  add(messages: Message[]): Job {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Queue is full (max: ${this.maxQueueSize})`);
    }

    const job: Job = {
      id: this.generateId(),
      messages,
      status: 'queued',
      createdAt: new Date()
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    
    this.emit('job:queued', job);
    this.processQueue();
    
    return job;
  }

  /**
   * Recupera um job pelo ID
   */
  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * Inicia a execução de um job
   * Transiciona status de 'queued' para 'running'
   */
  startJob(id: string): Job | undefined {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'queued') return undefined;

    job.status = 'running';
    job.startedAt = new Date();
    this.running.add(id);
    
    // Remove da fila
    const queueIndex = this.queue.indexOf(id);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }
    
    this.emit('job:started', job);
    return job;
  }

  /**
   * Completa a execução de um job
   * Transiciona status para 'completed' ou 'failed'
   */
  completeJob(id: string, result: JobResult): Job | undefined {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'running') return undefined;

    job.status = result.success ? 'completed' : 'failed';
    job.result = result;
    job.completedAt = new Date();
    job.error = result.error;
    this.running.delete(id);
    
    this.emit('job:completed', job);
    this.processQueue();
    
    return job;
  }

  /**
   * Processa a fila quando há workers disponíveis
   * Emite evento 'job:available' para o WorkerPool
   */
  private processQueue(): void {
    if (this.running.size >= this.maxConcurrent) return;
    if (this.queue.length === 0) return;

    const jobId = this.queue[0];
    if (!jobId) return;

    this.emit('job:available', jobId);
  }

  /**
   * Gera ID único para o job
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Retorna estatísticas do gerenciador
   */
  getStats(): JobManagerStats {
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      if (job.status === 'completed') completed++;
      if (job.status === 'failed') failed++;
    }

    return {
      queued: this.queue.length,
      running: this.running.size,
      completed,
      failed,
      total: this.jobs.size
    };
  }

  /**
   * Retorna a posição do job na fila (0-indexed)
   * Retorna -1 se não estiver na fila
   */
  getQueuePosition(jobId: string): number {
    return this.queue.indexOf(jobId);
  }

  /**
   * Inicia o cleanup automático de jobs antigos
   */
  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [id, job] of this.jobs.entries()) {
        if (job.completedAt) {
          const age = now - job.completedAt.getTime();
          if (age > this.ttlMs) {
            this.jobs.delete(id);
            cleaned++;
          }
        }
      }
      
      if (cleaned > 0) {
        this.emit('cleanup', { cleaned, remaining: this.jobs.size });
      }
    }, intervalMs);
  }

  /**
   * Para o cleanup automático
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Limpa todos os jobs (útil para testes)
   */
  clear(): void {
    this.jobs.clear();
    this.queue = [];
    this.running.clear();
  }

  /**
   * Retorna número de jobs em execução
   */
  getRunningJobsCount(): number {
    return this.running.size;
  }

  /**
   * Retorna lista de IDs de jobs em execução
   */
  getRunningJobIds(): string[] {
    return Array.from(this.running);
  }

  /**
   * Retorna lista de IDs na fila
   */
  getQueuedJobIds(): string[] {
    return [...this.queue];
  }
}
```

---

## Testes Unitários

### tests/unit/manager/JobManager.test.ts
```typescript
import { JobManager } from '../../../src/manager/JobManager';
import { Message } from '../../../src/types';

describe('JobManager', () => {
  let manager: JobManager;

  const createMessage = (content: string): Message => ({
    role: 'user',
    content
  });

  beforeEach(() => {
    manager = new JobManager(2, {
      ttlMs: 60000,
      cleanupIntervalMs: 1000,
      maxQueueSize: 10
    });
  });

  afterEach(() => {
    manager.stopCleanup();
    manager.clear();
  });

  describe('add', () => {
    it('should create a job with queued status', () => {
      const job = manager.add([createMessage('Hello')]);
      
      expect(job.id).toBeDefined();
      expect(job.status).toBe('queued');
      expect(job.messages).toHaveLength(1);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('should throw when queue is full', () => {
      const smallManager = new JobManager(1, {
        ttlMs: 60000,
        cleanupIntervalMs: 1000,
        maxQueueSize: 2
      });

      smallManager.add([createMessage('1')]);
      smallManager.add([createMessage('2')]);

      expect(() => {
        smallManager.add([createMessage('3')]);
      }).toThrow('Queue is full');

      smallManager.stopCleanup();
    });

    it('should emit job:queued event', (done) => {
      manager.once('job:queued', (job) => {
        expect(job.messages[0].content).toBe('Test');
        done();
      });

      manager.add([createMessage('Test')]);
    });
  });

  describe('startJob', () => {
    it('should transition job to running status', () => {
      const job = manager.add([createMessage('Hello')]);
      const started = manager.startJob(job.id);

      expect(started).toBeDefined();
      expect(started?.status).toBe('running');
      expect(started?.startedAt).toBeInstanceOf(Date);
    });

    it('should remove job from queue when started', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);
      
      expect(manager.getQueuePosition(job1.id)).toBe(0);
      expect(manager.getQueuePosition(job2.id)).toBe(1);

      manager.startJob(job1.id);

      expect(manager.getQueuePosition(job1.id)).toBe(-1);
      expect(manager.getQueuePosition(job2.id)).toBe(0);
    });

    it('should return undefined for non-existent job', () => {
      const result = manager.startJob('non-existent');
      expect(result).toBeUndefined();
    });

    it('should emit job:started event', (done) => {
      const job = manager.add([createMessage('Hello')]);
      
      manager.once('job:started', (startedJob) => {
        expect(startedJob.id).toBe(job.id);
        expect(startedJob.status).toBe('running');
        done();
      });

      manager.startJob(job.id);
    });
  });

  describe('completeJob', () => {
    it('should transition job to completed status on success', () => {
      const job = manager.add([createMessage('Hello')]);
      manager.startJob(job.id);

      const completed = manager.completeJob(job.id, {
        content: 'Response',
        messages: [createMessage('Hello'), { role: 'assistant', content: 'Response' }],
        success: true
      });

      expect(completed).toBeDefined();
      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeInstanceOf(Date);
    });

    it('should transition job to failed status on error', () => {
      const job = manager.add([createMessage('Hello')]);
      manager.startJob(job.id);

      const completed = manager.completeJob(job.id, {
        content: null,
        messages: [createMessage('Hello')],
        success: false,
        error: 'Something went wrong'
      });

      expect(completed?.status).toBe('failed');
      expect(completed?.error).toBe('Something went wrong');
    });

    it('should emit job:completed event', (done) => {
      const job = manager.add([createMessage('Hello')]);
      manager.startJob(job.id);

      manager.once('job:completed', (completedJob) => {
        expect(completedJob.id).toBe(job.id);
        expect(completedJob.status).toBe('completed');
        done();
      });

      manager.completeJob(job.id, {
        content: 'Done',
        messages: [],
        success: true
      });
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);
      const job3 = manager.add([createMessage('3')]);

      manager.startJob(job1.id);
      manager.completeJob(job1.id, { content: 'Done', messages: [], success: true });

      manager.startJob(job2.id);
      manager.completeJob(job2.id, { content: null, messages: [], success: false, error: 'Failed' });

      const stats = manager.getStats();

      expect(stats.queued).toBe(1); // job3
      expect(stats.running).toBe(0);
      expect(stats.completed).toBe(1); // job1
      expect(stats.failed).toBe(1); // job2
      expect(stats.total).toBe(3);
    });
  });

  describe('getQueuePosition', () => {
    it('should return correct position', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);
      const job3 = manager.add([createMessage('3')]);

      expect(manager.getQueuePosition(job1.id)).toBe(0);
      expect(manager.getQueuePosition(job2.id)).toBe(1);
      expect(manager.getQueuePosition(job3.id)).toBe(2);
    });

    it('should return -1 for job not in queue', () => {
      const job = manager.add([createMessage('Hello')]);
      manager.startJob(job.id);

      expect(manager.getQueuePosition(job.id)).toBe(-1);
    });
  });

  describe('cleanup', () => {
    it('should remove old completed jobs', (done) => {
      const shortTTLManager = new JobManager(2, {
        ttlMs: 100, // 100ms TTL
        cleanupIntervalMs: 50,
        maxQueueSize: 10
      });

      const job = shortTTLManager.add([createMessage('Hello')]);
      shortTTLManager.startJob(job.id);
      shortTTLManager.completeJob(job.id, { content: 'Done', messages: [], success: true });

      shortTTLManager.once('cleanup', () => {
        expect(shortTTLManager.get(job.id)).toBeUndefined();
        shortTTLManager.stopCleanup();
        done();
      });
    });
  });
});
```

---

## Notas de Implementação

1. **JobManager estende EventEmitter** - Permite comunicação assíncrona com WorkerPool
2. **Fila in-memory simples** - Array de IDs para controle de ordem
3. **Set para jobs running** - O(1) para verificação de existência
4. **Map para jobs** - O(1) para acesso por ID
5. **TTL configurável** - Jobs completados são removidos após TTL
6. **Cleanup em intervalo** - Evita memory leak em execução longa

---

## Critérios de Conclusão

- [ ] Todos os tipos definidos em `src/types/index.ts`
- [ ] `JobManager` implementado com todos os métodos
- [ ] Testes unitários passando (100% coverage do JobManager)
- [ ] Eventos funcionando corretamente
- [ ] Cleanup automático testado
- [ ] `npm test` passa sem erros

---

## Próximo Passo

Após completar este dia, prossiga para: **Fase 1 - Day 3: Worker Pool Implementation**
