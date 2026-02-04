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

interface WorkerInfo {
  worker: Worker;
  id: number;
  busy: boolean;
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
  private workers: WorkerInfo[] = [];
  private workerIdCounter = 0;
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
  private createWorker(): WorkerInfo {
    const worker = new Worker(this.workerFilePath, {
      workerData: { 
        graphPath: this.graphEnginePath
      }
    });

    const id = this.workerIdCounter++;
    const info: WorkerInfo = { worker, id, busy: false };
    
    logger.debug({ workerId: id }, 'Worker created');

    worker.on('message', (result: { jobId: string; result: JobResult }) => {
      logger.debug({ workerId: id, jobId: result.jobId }, 'Worker completed job');
      info.busy = false;
      this.jobManager.completeJob(result.jobId, result.result);
    });

    worker.on('error', (error) => {
      logger.error({ workerId: id, error }, 'Worker error');
      info.busy = false;
      this.restartWorker(info);
    });

    worker.on('exit', (code) => {
      info.busy = false;
      if (code !== 0) {
        logger.warn({ workerId: id, code }, 'Worker stopped unexpectedly');
        // Remove da lista e cria novo se necessário
        const index = this.workers.findIndex(w => w.id === id);
        if (index > -1) {
          this.workers.splice(index, 1);
          this.createWorker();
        }
      }
    });

    this.workers.push(info);
    return info;
  }

  /**
   * Reinicia um worker que falhou
   */
  private restartWorker(oldInfo: WorkerInfo): void {
    const index = this.workers.findIndex(w => w.id === oldInfo.id);
    if (index > -1) {
      logger.info({ workerId: oldInfo.id }, 'Restarting worker');
      this.workers.splice(index, 1);
      oldInfo.worker.terminate().catch(() => {});
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
    // Find worker FIRST before marking job as started
    const workerInfo = this.findAvailableWorker();
    if (!workerInfo) {
      // No worker available, trigger JobManager to try next job
      // The current job stays queued and will be retried later
      setTimeout(() => this.jobManager.processQueue(), 100);
      return;
    }

    const job = this.jobManager.startJob(jobId);
    if (!job) {
      // Job was already started by another process, skip
      return;
    }

    try {
      // Send job to worker first, then mark as busy
      workerInfo.worker.postMessage({
        jobId: job.id,
        messages: job.messages
      });
      
      // Mark worker as busy only after successful postMessage
      workerInfo.busy = true;
      
      logger.debug({ jobId, workerId: workerInfo.id }, 'Job sent to worker');
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
   * Retorna o primeiro worker que não está ocupado
   */
  private findAvailableWorker(): WorkerInfo | undefined {
    return this.workers.find(w => !w.busy);
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
    const busyCount = this.workers.filter(w => w.busy).length;
    return {
      ...this.jobManager.getStats(),
      workers: this.workers.length,
      availableWorkers: this.workers.length - busyCount,
      busyWorkers: busyCount
    };
  }

  /**
   * Encerra o pool gracefulmente
   */
  async terminate(): Promise<void> {
    logger.info('Terminating worker pool...');
    
    this.jobManager.stopCleanup();
    
    const timeoutMs = 5000; // 5 second timeout
    
    await Promise.all(this.workers.map(({ worker }) => {
      return Promise.race([
        new Promise<void>((resolve) => {
          worker.once('exit', () => resolve());
          worker.terminate().catch(() => resolve());
        }),
        new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
      ]);
    }));
    
    this.workers = [];
    logger.info('Worker pool terminated');
  }

  /**
   * Retorna número de jobs em execução
   */
  getRunningJobsCount(): number {
    return this.jobManager.getRunningJobsCount();
  }
}
