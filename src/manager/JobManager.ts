import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Job, JobResult, Message } from '../types';

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
  maxExecutionTimeMs?: number;
}

const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 10 * 1024; // 10KB

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
  private maxExecutionTimeMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxConcurrent: number = 4, options: JobManagerOptions) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = options.maxQueueSize;
    this.ttlMs = options.ttlMs;
    this.maxExecutionTimeMs = options.maxExecutionTimeMs ?? 300000; // 5 minutes default
    this.startCleanup(options.cleanupIntervalMs);
  }

  /**
   * Adiciona um novo job à fila
   * @throws Error se a fila estiver cheia
   */
  add(messages: Message[]): Job {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Queue is full');
    }

    if (messages.length > MAX_MESSAGES) {
      throw new Error('Too many messages');
    }
    for (const msg of messages) {
      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        throw new Error('Message content too large');
      }
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
  processQueue(): void {
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
    return randomUUID();
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
        
        // Check for stuck running jobs
        if (job.status === 'running' && job.startedAt) {
          const executionTime = now - job.startedAt.getTime();
          if (executionTime > this.maxExecutionTimeMs) {
            // Auto-fail the job
            this.completeJob(id, {
              content: null,
              messages: job.messages,
              success: false,
              error: 'Job exceeded maximum execution time'
            });
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
