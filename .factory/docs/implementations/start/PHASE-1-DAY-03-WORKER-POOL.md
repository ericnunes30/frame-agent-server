# Fase 1 - Day 3: Worker Pool Implementation

**Fase:** 1 - Core Library  
**Dia:** 3  
**Status:** Pronto para implementação  
**Tempo estimado:** 8-10 horas

---

## Objetivo

Implementar o `WorkerPool` com native `worker_threads`, worker que recebe factory do GraphEngine, tratamento de erros e restart de workers.

---

## Tarefas

### 3.1 Implementar WorkerPool
- [ ] Criar classe `WorkerPool`
- [ ] Integrar com `JobManager`
- [ ] Criar workers com `worker_threads`
- [ ] Implementar distribuição de jobs para workers
- [ ] Implementar tratamento de erros e restart

### 3.2 Implementar Worker Thread
- [ ] Criar `graph.worker.ts`
- [ ] Worker recebe factory/config do GraphEngine
- [ ] Worker executa `graphEngine.execute()` do SDK
- [ ] Tratamento de erros no worker
- [ ] Comunicação com parent via `parentPort`

### 3.3 Criar Logger
- [ ] Implementar `createLogger()` com pino
- [ ] Configurar níveis de log
- [ ] Formato estruturado JSON

### 3.4 Testes Unitários
- [ ] Testar criação do WorkerPool
- [ ] Testar submit de jobs
- [ ] Testar recuperação de job
- [ ] Testar estatísticas
- [ ] Testar shutdown graceful

---

## Arquivos a Criar

### src/utils/logger.ts
```typescript
import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Cria um logger estruturado com pino
 */
export function createLogger(name: string) {
  return pino({
    name,
    level: LOG_LEVEL,
    transport: process.env.NODE_ENV === 'development' 
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      : undefined,
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV || 'production'
    }
  });
}

export const logger = createLogger('frame-agent-server');
```

### src/workers/WorkerPool.ts
```typescript
import { Worker } from 'worker_threads';
import { resolve } from 'path';
import { Job, JobResult, Message } from '../types';
import { JobManager, JobManagerOptions } from '../manager/JobManager';
import { createLogger } from '../utils/logger';

const logger = createLogger('WorkerPool');

export interface WorkerPoolOptions {
  maxWorkers: number;
  jobTTL: number;
  maxQueueSize: number;
  cleanupIntervalMs: number;
}

/**
 * Pool de workers para execução concorrente de grafos
 * 
 * Responsabilidades:
 * - Gerenciar pool de workers (criação, restart, término)
 * - Distribuir jobs para workers disponíveis
 * - Integrar com JobManager para controle de fila
 * - Fornecer estatísticas de execução
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private jobManager: JobManager;
  private graphEnginePath: string;
  private workerFilePath: string;

  constructor(graphEnginePath: string, options: WorkerPoolOptions) {
    this.graphEnginePath = graphEnginePath;
    this.workerFilePath = resolve(__dirname, 'graph.worker.js');
    
    const jobManagerOptions: JobManagerOptions = {
      ttlMs: options.jobTTL,
      cleanupIntervalMs: options.cleanupIntervalMs,
      maxQueueSize: options.maxQueueSize
    };

    this.jobManager = new JobManager(options.maxWorkers, jobManagerOptions);

    // Criar workers
    for (let i = 0; i < options.maxWorkers; i++) {
      this.createWorker();
    }

    this.setupQueueListeners();
  }

  /**
   * Cria um novo worker thread
   */
  private createWorker(): Worker {
    const worker = new Worker(this.workerFilePath, {
      workerData: { 
        graphPath: this.graphEnginePath
      }
    });

    const workerId = this.workers.length;
    logger.debug({ workerId }, 'Worker created');

    worker.on('message', (result: { jobId: string; result: JobResult }) => {
      logger.debug({ workerId, jobId: result.jobId }, 'Worker completed job');
      this.jobManager.completeJob(result.jobId, result.result);
    });

    worker.on('error', (error) => {
      logger.error({ workerId, error }, 'Worker error');
      this.restartWorker(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn({ workerId, code }, 'Worker stopped unexpectedly');
        // Remove da lista e cria novo se necessário
        const index = this.workers.indexOf(worker);
        if (index > -1) {
          this.workers.splice(index, 1);
          this.createWorker();
        }
      }
    });

    this.workers.push(worker);
    return worker;
  }

  /**
   * Reinicia um worker que falhou
   */
  private restartWorker(oldWorker: Worker): void {
    const index = this.workers.indexOf(oldWorker);
    if (index > -1) {
      logger.info({ index }, 'Restarting worker');
      this.workers.splice(index, 1);
      oldWorker.terminate().catch(() => {});
      this.createWorker();
    }
  }

  /**
   * Configura listeners de eventos do JobManager
   */
  private setupQueueListeners(): void {
    this.jobManager.on('job:queued', (job: Job) => {
      logger.debug({ jobId: job.id }, 'Job queued');
    });

    this.jobManager.on('job:started', (job: Job) => {
      logger.debug({ jobId: job.id }, 'Job started');
    });

    this.jobManager.on('job:completed', (job: Job) => {
      logger.debug({ jobId: job.id, status: job.status }, 'Job completed');
    });

    this.jobManager.on('job:available', async (jobId: string) => {
      await this.executeJob(jobId);
    });
  }

  /**
   * Executa um job em um worker disponível
   */
  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobManager.startJob(jobId);
    if (!job) {
      logger.warn({ jobId }, 'Failed to start job - not found or not queued');
      return;
    }

    // Encontra worker disponível (não ocupado)
    const worker = await this.findAvailableWorker();
    if (!worker) {
      logger.error({ jobId }, 'No available workers');
      
      // Reverte o status do job para queued
      // Isso é uma simplificação - em produção, teríamos controle mais fino
      this.jobManager.completeJob(jobId, {
        content: null,
        messages: job.messages,
        success: false,
        error: 'No available workers'
      });
      return;
    }

    try {
      worker.postMessage({
        jobId: job.id,
        messages: job.messages
      });
      logger.debug({ jobId }, 'Job sent to worker');
    } catch (error) {
      logger.error({ jobId, error }, 'Failed to send job to worker');
      
      this.jobManager.completeJob(jobId, {
        content: null,
        messages: job.messages,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Encontra um worker disponível
   * Por simplicidade, retorna o primeiro worker não morto
   * Em produção, teríamos controle de ocupação por worker
   */
  private async findAvailableWorker(): Promise<Worker | undefined> {
    // Aguarda um pouco se todos estiverem ocupados
    // Na implementação real, teríamos um sistema de ocupação
    const availableWorker = this.workers.find(w => !this.isWorkerBusy(w));
    return availableWorker || this.workers.find(w => !w.isDead());
  }

  /**
   * Verifica se worker está ocupado
   * Simplificação: assume que não está ocupado se não está morto
   */
  private isWorkerBusy(worker: Worker): boolean {
    // Na implementação real, teríamos tracking de jobs por worker
    return worker.isDead();
  }

  /**
   * Submete mensagens para execução
   */
  submit(messages: Message[]): Job {
    return this.jobManager.add(messages);
  }

  /**
   * Recupera um job pelo ID
   */
  getJob(id: string): Job | undefined {
    return this.jobManager.get(id);
  }

  /**
   * Retorna posição do job na fila
   */
  getQueuePosition(jobId: string): number {
    return this.jobManager.getQueuePosition(jobId);
  }

  /**
   * Retorna estatísticas do pool
   */
  getStats() {
    return {
      ...this.jobManager.getStats(),
      workers: this.workers.length,
      availableWorkers: this.workers.filter(w => !w.isDead()).length
    };
  }

  /**
   * Encerra o pool gracefulmente
   */
  async terminate(): Promise<void> {
    logger.info('Terminating worker pool...');
    
    this.jobManager.stopCleanup();
    
    await Promise.all(this.workers.map((worker, index) => {
      return new Promise<void>((resolve) => {
        worker.once('exit', () => resolve());
        worker.terminate().catch(() => resolve());
      });
    }));
    
    logger.info('Worker pool terminated');
  }

  /**
   * Retorna número de jobs em execução
   */
  getRunningJobsCount(): number {
    return this.jobManager.getRunningJobsCount();
  }
}
```

### src/workers/graph.worker.ts
```typescript
import { parentPort, workerData } from 'worker_threads';
import { JobResult, Message } from '../types';

/**
 * Worker Thread para execução de grafos
 * 
 * Este worker:
 * 1. Carrega o GraphEngine do caminho fornecido
 * 2. Escuta mensagens do parent
 * 3. Executa o grafo usando graphEngine.execute()
 * 4. Retorna resultado via parentPort
 */

interface WorkerTask {
  jobId: string;
  messages: Message[];
}

// Carregar o grafo do usuário
let graphEngine: any;

try {
  const graphModule = require(workerData.graphPath);
  graphEngine = graphModule.default || graphModule.graph || graphModule.createGraph?.();
  
  if (!graphEngine || typeof graphEngine.execute !== 'function') {
    throw new Error(
      `Invalid GraphEngine in ${workerData.graphPath}. ` +
      `Export default, named export 'graph', or 'createGraph()' function.`
    );
  }
  
  console.log(`[Worker] GraphEngine loaded from ${workerData.graphPath}`);
} catch (error) {
  console.error('[Worker] Failed to load GraphEngine:', error);
  process.exit(1);
}

if (parentPort) {
  parentPort.on('message', async (task: WorkerTask) => {
    const startTime = Date.now();
    
    console.log(`[Worker] Starting job ${task.jobId}`);
    
    try {
      // Executa o grafo usando a API do SDK
      const result = await graphEngine.execute({
        messages: task.messages,
        data: {},
        metadata: {}
      });
      
      const executionTime = Date.now() - startTime;
      
      const jobResult: JobResult = {
        content: result.state.messages[result.state.messages.length - 1]?.content || null,
        messages: result.state.messages,
        success: result.status === 'FINISHED' || result.status === 'COMPLETED',
        error: result.status === 'ERROR' ? 'Graph execution failed' : undefined,
        metadata: {
          executionTime,
          startTime: new Date(startTime),
          endTime: new Date(),
          graphStatus: result.status
        }
      };

      console.log(`[Worker] Job ${task.jobId} completed in ${executionTime}ms`);

      parentPort?.postMessage({
        jobId: task.jobId,
        result: jobResult
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.error(`[Worker] Job ${task.jobId} failed:`, error);
      
      const jobResult: JobResult = {
        content: null,
        messages: task.messages,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime,
          startTime: new Date(startTime),
          endTime: new Date()
        }
      };

      parentPort?.postMessage({
        jobId: task.jobId,
        result: jobResult
      });
    }
  });
  
  console.log('[Worker] Ready and waiting for tasks');
}
```

---

## Testes Unitários

### tests/unit/workers/WorkerPool.test.ts
```typescript
import { WorkerPool } from '../../../src/workers/WorkerPool';
import { resolve } from 'path';

describe('WorkerPool', () => {
  let pool: WorkerPool;
  const mockGraphPath = resolve(__dirname, '../../fixtures/mock-graph.js');

  beforeEach(() => {
    pool = new WorkerPool(mockGraphPath, {
      maxWorkers: 2,
      jobTTL: 60000,
      maxQueueSize: 10,
      cleanupIntervalMs: 1000
    });
  });

  afterEach(async () => {
    await pool.terminate();
  });

  describe('constructor', () => {
    it('should create workers on initialization', () => {
      const stats = pool.getStats();
      expect(stats.workers).toBe(2);
      expect(stats.availableWorkers).toBe(2);
    });
  });

  describe('submit', () => {
    it('should create a job and return it', () => {
      const job = pool.submit([{ role: 'user', content: 'Hello' }]);
      
      expect(job.id).toBeDefined();
      expect(job.status).toBe('queued');
      expect(job.messages).toHaveLength(1);
    });

    it('should queue multiple jobs', () => {
      const job1 = pool.submit([{ role: 'user', content: '1' }]);
      const job2 = pool.submit([{ role: 'user', content: '2' }]);
      const job3 = pool.submit([{ role: 'user', content: '3' }]);

      expect(pool.getQueuePosition(job1.id)).toBeGreaterThanOrEqual(-1);
      expect(pool.getQueuePosition(job2.id)).toBeGreaterThanOrEqual(-1);
      expect(pool.getQueuePosition(job3.id)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getJob', () => {
    it('should return job by id', () => {
      const job = pool.submit([{ role: 'user', content: 'Hello' }]);
      const retrieved = pool.getJob(job.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(job.id);
    });

    it('should return undefined for non-existent job', () => {
      const retrieved = pool.getJob('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return pool statistics', () => {
      pool.submit([{ role: 'user', content: '1' }]);
      pool.submit([{ role: 'user', content: '2' }]);

      const stats = pool.getStats();

      expect(stats).toHaveProperty('queued');
      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('workers');
      expect(stats).toHaveProperty('availableWorkers');
      expect(stats.workers).toBe(2);
    });
  });

  describe('terminate', () => {
    it('should terminate all workers', async () => {
      pool.submit([{ role: 'user', content: 'Hello' }]);
      
      await pool.terminate();
      
      const stats = pool.getStats();
      expect(stats.availableWorkers).toBe(0);
    });
  });
});
```

### tests/fixtures/mock-graph.js
```javascript
/**
 * Mock GraphEngine para testes
 */
module.exports = {
  graph: {
    execute: async ({ messages }) => {
      // Simula delay de execução
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        state: {
          messages: [
            ...messages,
            { role: 'assistant', content: 'Mock response' }
          ],
          data: {},
          metadata: {}
        },
        status: 'FINISHED'
      };
    }
  }
};
```

---

## Notas de Implementação

1. **Worker recebe caminho do módulo** - Não instancia diretamente, carrega via require
2. **GraphEngine deve exportar** - `default`, `graph`, ou `createGraph()`
3. **Workers são recriados em caso de erro** - Auto-healing do pool
4. **Comunicação via postMessage** - Standard worker_threads API
5. **Logger com pino** - JSON estruturado para produção, pretty para dev

---

## Critérios de Conclusão

- [ ] `WorkerPool` implementado com criação de workers
- [ ] `graph.worker.ts` carrega e executa GraphEngine
- [ ] Logger implementado com pino
- [ ] Testes unitários passando
- [ ] Workers reiniciam em caso de erro
- [ ] Shutdown graceful funciona
- [ ] `npm test` passa sem erros

---

## Próximo Passo

Após completar este dia, prossiga para: **Fase 1 - Day 4: Fastify Server & Routes**
