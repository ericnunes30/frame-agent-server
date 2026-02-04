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
