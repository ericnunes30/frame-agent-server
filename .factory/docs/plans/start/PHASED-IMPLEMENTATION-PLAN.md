# Frame-Agent-Server: Phased Implementation Plan (Corrected)

**Package:** `@ericnunes/frame-agent-server`  
**Version:** 1.0.0  
**Date:** 2026-02-03  
**Status:** Ready for Implementation  

---

## Executive Summary

Este plano descreve a implementação do `@ericnunes/frame-agent-server`, **um servidor HTTP que expõe grafos de execução (`GraphEngine`) criados com `@ericnunes/frame-agent-sdk`.** O servidor **não cria nem instancia agentes**; ele apenas recebe um `GraphEngine` já configurado (ou um *factory* que o crie) e o disponibiliza via API HTTP.

### Key Constraints
- **Um grafo por servidor** (modelo isolado)
- **Worker Threads** para concorrência (padrão: 4 workers)
- **Fila in-memory** (sem Redis para MVP)
- **Execução assíncrona com polling** (`POST /execute`, `GET /jobs/:id`)
- **Sem streaming** (HTTP polling apenas)
- **CLI na Fase 2** - Fase 1 é apenas biblioteca

> **Importante:** O servidor é apenas um **wrapper HTTP** para `GraphEngine`. Toda a lógica de agentes, nós, edges e orquestração fica no SDK e nos templates/boilerplates.

---

## Library Versions (Verified)

| Package | Version | Notes |
|---------|---------|-------|
| fastify | ^5.7.2 | Node 20+, JSON Schema obrigatório |
| pino | ^10.3.0 | Logging estruturado |
| pino-http | ^10.0.0 | Middleware Fastify |
| @fastify/cors | ^10.0.0 | CORS support |
| @fastify/rate-limit | ^8.0.0 | Rate limiting |
| @ericnunes/frame-agent-sdk | ^0.0.6 | Peer dependency |

---

## Phase 1: Core Library (Week 1)

**Objective:** Publicar pacote npm com API `serveGraph()` (não `serveAgent`)

### Day 1: Project Setup & Dependencies

#### Tasks
- [ ] Estrutura de pacote npm (`package.json`, `tsconfig.json`)
- [ ] Instalar dependências (Fastify, Worker Threads, etc.)
- [ ] TypeScript strict mode
- [ ] Jest para testes
- [ ] **Nenhum agente é criado aqui** - apenas base do servidor

#### Files to Create
```
frame-agent-server/
├── src/
│   ├── types/
│   │   └── index.ts
│   ├── manager/
│   │   └── JobManager.ts
│   ├── workers/
│   │   ├── WorkerPool.ts
│   │   └── graph.worker.ts          # <- Renomeado de agent.worker.ts
│   ├── server/
│   │   └── index.ts
│   ├── routes/
│   │   └── execute.ts
│   ├── utils/
│   │   └── logger.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── jest.config.js
└── .env.example
```

#### Dependencies
```bash
# Production
npm install fastify@^5.7.2 @fastify/cors@^10.0.0 @fastify/rate-limit@^8.0.0 pino@^10.3.0 pino-http@^10.0.0 dotenv@^16.4.0

# Development
npm install -D typescript@^5.5.0 @types/node@^20.0.0 tsx@^4.0.0 jest@^29.0.0 @types/jest@^29.0.0 ts-jest@^29.0.0
```

#### Critical Notes
- **Server importa SDK como peer dependency** - `GraphEngine` é usado diretamente
- Worker Threads executam `graph.execute()` - não criam nem configuram grafos
- TypeScript strict mode obrigatório
- O server é **infraestrutura pura** - não conhece nós, edges, tools ou configuração do grafo

---

### Day 2: Type Definitions & Job Queue

#### Tasks
- [ ] Definir interfaces TypeScript
- [ ] Implementar `JobManager` (fila in-memory)
- [ ] TTL e cleanup automático
- [ ] Testes unitários

#### File: `src/types/index.ts`
```typescript
// ❌ REMOVIDO: import { Message, AgentExecutionResult } from '@ericnunes/frame-agent-sdk';
// ✅ Server não depende de tipos do SDK - define seus próprios tipos

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

// ✅ Interface que o GraphEngine deve implementar (contrato mínimo)
export interface IGraphEngine {
  execute(initialState: { messages: Message[]; data?: any; metadata?: any }): Promise<{
    state: { messages: Message[]; data?: any; metadata?: any };
    status: string;
  }>;
}
```

#### File: `src/manager/JobManager.ts`
```typescript
import { EventEmitter } from 'events';
import { Job, JobStatus, JobResult } from '../types';

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

  add(messages: Message[]): Job {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Queue is full');
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

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  startJob(id: string): Job | undefined {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'queued') return undefined;

    job.status = 'running';
    job.startedAt = new Date();
    this.running.add(id);
    
    const queueIndex = this.queue.indexOf(id);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }
    
    this.emit('job:started', job);
    return job;
  }

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

  private processQueue(): void {
    if (this.running.size >= this.maxConcurrent) return;
    if (this.queue.length === 0) return;

    const jobId = this.queue[0];
    if (!jobId) return;

    this.emit('job:available', jobId);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

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

  getQueuePosition(jobId: string): number {
    return this.queue.indexOf(jobId);
  }

  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, job] of this.jobs.entries()) {
        if (job.completedAt) {
          const age = now - job.completedAt.getTime();
          if (age > this.ttlMs) {
            this.jobs.delete(id);
          }
        }
      }
    }, intervalMs);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  clear(): void {
    this.jobs.clear();
    this.queue = [];
    this.running.clear();
  }

  getRunningJobsCount(): number {
    return this.running.size;
  }
}
```

---

### Day 3: Worker Pool Implementation

#### Tasks
- [ ] Implementar `WorkerPool` com native `worker_threads`
- [ ] **Worker recebe factory do GraphEngine, não cria agente**
- [ ] Tratamento de erros e restart de workers
- [ ] Testes unitários

#### File: `src/workers/WorkerPool.ts`
```typescript
import { Worker } from 'worker_threads';
import { resolve } from 'path';
import { Job, JobResult, ServerOptions, Message } from '../types';
import { GraphEngine, GraphEngineExecuteParams } from '@ericnunes/frame-agent-sdk';
import { JobManager } from '../manager/JobManager';
import { createLogger } from '../utils/logger';

const logger = createLogger('WorkerPool');

export interface WorkerPoolOptions {
  maxWorkers: number;
  jobTTL: number;
  maxQueueSize: number;
  cleanupIntervalMs: number;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private jobManager: JobManager;
  private graphEngine: GraphEngine;  // ✅ Instância do GraphEngine do SDK
  private workerFilePath: string;

  constructor(graphEngine: GraphEngine, options: WorkerPoolOptions) {
    this.graphEngine = graphEngine;
    this.workerFilePath = resolve(__dirname, 'graph.worker.js');
    
    this.jobManager = new JobManager(options.maxWorkers, {
      ttlMs: options.jobTTL,
      cleanupIntervalMs: options.cleanupIntervalMs,
      maxQueueSize: options.maxQueueSize
    });

    // Criar workers - todos compartilham a mesma instância do grafo
    for (let i = 0; i < options.maxWorkers; i++) {
      this.createWorker();
    }

    this.setupQueueListeners();
  }

  private createWorker(): void {
    // ✅ Passa a instância do grafo para o worker
    const worker = new Worker(this.workerFilePath, {
      workerData: { 
        // O worker receberá o grafo via serialização ou referência
        // Para MVP, passamos o caminho do módulo que exporta o grafo
        graphPath: process.env.GRAPH_PATH || './graph.js'
      }
    });

    worker.on('message', (result: { jobId: string; result: JobResult }) => {
      this.jobManager.completeJob(result.jobId, result.result);
    });

    worker.on('error', (error) => {
      logger.error({ error }, 'Worker error');
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn({ code }, 'Worker stopped with exit code');
      }
    });

    this.workers.push(worker);
  }

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

  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobManager.startJob(jobId);
    if (!job) return;

    const worker = this.workers.find(w => !w.isDead());
    if (!worker) {
      logger.error('No available workers');
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

  submit(messages: Message[]): Job {
    return this.jobManager.add(messages);
  }

  getJob(id: string): Job | undefined {
    return this.jobManager.get(id);
  }

  getQueuePosition(jobId: string): number {
    return this.jobManager.getQueuePosition(jobId);
  }

  getStats() {
    return {
      ...this.jobManager.getStats(),
      workers: this.workers.length,
      availableWorkers: this.workers.filter(w => !w.isDead()).length
    };
  }

  async terminate(): Promise<void> {
    this.jobManager.stopCleanup();
    
    await Promise.all(this.workers.map(worker => {
      return new Promise<void>((resolve) => {
        worker.once('exit', () => resolve());
        worker.terminate();
      });
    }));
  }

  getRunningJobsCount(): number {
    return this.jobManager.getRunningJobsCount();
  }
}
```

#### File: `src/workers/graph.worker.ts`
```typescript
import { parentPort, workerData } from 'worker_threads';
import { JobResult, Message } from '../types';
import { GraphEngine } from '@ericnunes/frame-agent-sdk';

// ✅ Worker USA o SDK diretamente - importado do @ericnunes/frame-agent-sdk
// O grafo é carregado do arquivo especificado em workerData.graphPath

interface WorkerTask {
  jobId: string;
  messages: Message[];
}

// Carregar o grafo do usuário (exportado como default ou 'graph')
let graphEngine: GraphEngine;

try {
  const graphModule = require(workerData.graphPath);
  graphEngine = graphModule.default || graphModule.graph;
  
  if (!graphEngine || typeof graphEngine.execute !== 'function') {
    throw new Error(`Invalid GraphEngine in ${workerData.graphPath}. Export default or named export 'graph'.`);
  }
} catch (error) {
  console.error('Failed to load GraphEngine:', error);
  process.exit(1);
}

if (parentPort) {
  parentPort.on('message', async (task: WorkerTask) => {
    const startTime = Date.now();
    
    try {
      // ✅ Executa o grafo usando a API do SDK
      const result = await graphEngine.execute({
        messages: task.messages,
        data: {},
        metadata: {}
      });
      
      const jobResult: JobResult = {
        content: result.state.messages[result.state.messages.length - 1]?.content || null,
        messages: result.state.messages,
        success: result.status === 'FINISHED' || result.status === 'COMPLETED',
        error: result.status === 'ERROR' ? 'Graph execution failed' : undefined,
        metadata: {
          executionTime: Date.now() - startTime,
          startTime: new Date(startTime),
          endTime: new Date(),
          graphStatus: result.status
        }
      };

      parentPort?.postMessage({
        jobId: task.jobId,
        result: jobResult
      });
    } catch (error) {
      const jobResult: JobResult = {
        content: null,
        messages: task.messages,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime,
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
}
```

---

### Day 4: Fastify Server & Routes

#### Tasks
- [ ] Configurar Fastify com plugins
- [ ] Implementar endpoints com JSON schemas
- [ ] **Interface `serveGraph()` em vez de `serveAgent()`**

#### File: `src/server/index.ts`
```typescript
import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { GraphEngine } from '@ericnunes/frame-agent-sdk';
import { WorkerPool } from '../workers/WorkerPool';
import { executeRoutes } from '../routes/execute';
import { healthRoutes } from '../routes/health';
import { createLogger } from '../utils/logger';
import { ServerOptions } from '../types';

dotenv.config();

const logger = createLogger('Server');

export interface ServeGraphOptions extends ServerOptions {
  cors?: {
    origin?: string | string[];
  };
}

// ✅ serveGraph recebe instância de GraphEngine do SDK
export async function serveGraph(
  graphEngine: GraphEngine, 
  options: ServeGraphOptions = {}
): Promise<ReturnType<typeof fastify>> {
  const port = options.port || parseInt(process.env.PORT || '3000', 10);
  const maxWorkers = options.workers || parseInt(process.env.WORKERS || '4', 10);
  const jobTTL = options.jobTTL || parseInt(process.env.JOB_TTL || '3600000', 10);
  const maxQueueSize = options.maxQueueSize || parseInt(process.env.MAX_QUEUE_SIZE || '100', 10);
  const shutdownTimeout = options.shutdownTimeout || parseInt(process.env.SHUTDOWN_TIMEOUT || '60000', 10);
  const startTime = Date.now();

  // Validar que é um GraphEngine válido
  if (!graphEngine || typeof graphEngine.execute !== 'function') {
    throw new Error('Invalid GraphEngine: must have execute() method from @ericnunes/frame-agent-sdk');
  }

  const server = fastify({
    logger: createLogger('Fastify')
  });

  await server.register(cors, {
    origin: options.cors?.origin || process.env.CORS_ORIGIN || '*'
  });

  await server.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute'
  });

  const workerPool = new WorkerPool(graphEngine, {
    maxWorkers,
    jobTTL,
    maxQueueSize,
    cleanupIntervalMs: 60000
  });

  await server.register(executeRoutes, { prefix: '/', workerPool });
  await server.register(healthRoutes, { prefix: '/', workerPool, startTime });

  server.setErrorHandler((error, request, reply) => {
    logger.error({ error, requestId: request.id }, 'Request error');
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal server error'
    });
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    
    const runningJobs = workerPool.getRunningJobsCount();
    logger.info({ runningJobs }, `Waiting for ${runningJobs} running jobs to complete`);
    
    server.close(async () => {
      await workerPool.terminate();
      logger.info('Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error({ runningJobs }, `Forced shutdown - ${runningJobs} jobs were still running`);
      process.exit(1);
    }, shutdownTimeout);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`Server running on http://0.0.0.0:${port}`);
    logger.info(`Workers: ${maxWorkers}, Job TTL: ${jobTTL}ms`);
    return server;
  } catch (err) {
    logger.error(err, 'Failed to start server');
    throw err;
  }
}
```

---

### Day 5: Integration & Testing

#### File: `tests/integration/server.test.ts`
```typescript
import { serveGraph } from '../../src/server';

// Mock simples de GraphEngine para testes
const createMockGraphEngine = () => ({
  execute: async ({ messages }: { messages: any[] }) => ({
    state: { 
      messages: [...messages, { role: 'assistant', content: 'Mock response' }],
      data: {},
      metadata: {}
    },
    status: 'FINISHED'
  })
});

describe('Server Integration', () => {
  let server: any;

  beforeAll(async () => {
    const mockGraph = createMockGraphEngine();
    server = await serveGraph(mockGraph, { port: 0 });
  });

  afterAll(async () => {
    await server.close();
  });

  it('POST /execute should create a job', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        messages: [{ role: 'user', content: 'Hello' }]
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.jobId).toBeDefined();
    expect(body.status).toBe('queued');
  });

  it('GET /health should return health status', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });
});
```

---

## Phase 2: CLI & Boilerplate (Week 2)

### Template/Boilerplate Structure

O usuário cria seu projeto usando o template:

```
meu-agente/
├── src/
│   ├── graph.ts          # Define o grafo usando SDK
│   ├── index.ts          # Cria grafo e chama serveGraph
│   └── graph.factory.ts  # Factory exportada para workers
├── package.json
├── tsconfig.json
└── Dockerfile
```

#### File: `template/src/graph.ts`
```typescript
// ✅ Usuário define o grafo com SDK
import { GraphEngine, createAgentNode } from '@ericnunes/frame-agent-sdk';

export function createGraph() {
  return new GraphEngine({
    nodes: {
      agent: createAgentNode({
        llm: { 
          model: process.env.MODEL || 'gpt-4o-mini',
          apiKey: process.env.OPENAI_API_KEY! 
        },
        mode: 'react',
        agentInfo: { 
          name: 'Assistente', 
          goal: 'Ajudar usuários',
          backstory: 'Um assistente prestativo'
        }
      })
    },
    edges: { agent: 'END' },
    entryPoint: 'agent'
  });
}
```

#### File: `template/src/index.ts`
```typescript
// ✅ Usuário cria grafo e serve
import { serveGraph } from '@ericnunes/frame-agent-server';
import { createGraph } from './graph';

const graph = createGraph();

serveGraph(graph, {
  port: parseInt(process.env.PORT || '3000'),
  workers: parseInt(process.env.WORKERS || '4')
});
```

#### File: `template/src/graph.factory.ts`
```typescript
// ✅ Factory para workers
import { createGraph } from './graph';

// Export para workers
module.exports = { createGraph };
module.exports.default = createGraph;
```

---

## Resumo das Correções

| Aspecto | Versão Errada (Original) | Versão Corrigida |
|---------|------------------------|------------------|
| **API** | `serveAgent(agent, options)` | `serveGraph(graphEngine, options)` |
| **Worker** | `new AgentLLM(config)` | `graphEngine.execute()` do SDK |
| **Import do SDK** | Não importava | **✅ Importa diretamente** como peer dependency |
| **Template** | Cria `AgentLLM` e chama `serveAgent` | Define `GraphEngine` e chama `serveGraph` |
| **Papel do Server** | Cria/gerencia agentes | **Apenas expõe grafos via HTTP** |
| **Papel do SDK** | Fornece `AgentLLM` | Fornece `GraphEngine` para orquestração |
| **Dependency** | Server sem SDK | Server com SDK como **peer dependency** |

---

## Arquitetura Final

```
┌─────────────────────────────────────────────────────────────┐
│  TEMPLATE/BOILERPLATE (usuário)                            │
│  npm install @ericnunes/frame-agent-sdk                    │
│  npm install @ericnunes/frame-agent-server                 │
│                                                              │
│  src/graph.ts:                                              │
│  import { GraphEngine } from '@ericnunes/frame-agent-sdk'  │
│  → Usuário define o grafo (nós, edges, tools, etc.)        │
│                                                              │
│  src/index.ts:                                              │
│  import { serveGraph } from '@ericnunes/frame-agent-server'│
│  import { createGraph } from './graph'                      │
│                                                              │
│  const graph = createGraph()  // Grafo definido pelo usuário│
│  serveGraph(graph, {...})    // Server apenas expõe        │
└─────────────────────────────────────────────────────────────┘
                          ↓ peer dependency
┌─────────────────────────────────────────────────────────────┐
│  @ericnunes/frame-agent-server                              │
│  npm install @ericnunes/frame-agent-sdk (peer)             │
│                                                              │
│  src/server/index.ts:                                       │
│  import { GraphEngine } from '@ericnunes/frame-agent-sdk'  │
│  export async function serveGraph(graph: GraphEngine)      │
│                                                              │
│  src/workers/graph.worker.ts:                               │
│  import { GraphEngine } from '@ericnunes/frame-agent-sdk'  │
│  const result = await graphEngine.execute(...)              │
└─────────────────────────────────────────────────────────────┘
```

**Resumo:**
- Server **importa SDK** como peer dependency
- Server **não cria nem configura** grafos - apenas expõe via HTTP
- Workers **usam GraphEngine.execute()** do SDK diretamente
- Usuário define grafo completo no template/boilerplate

---

**Document Version:** 1.0 (Corrected)  
**Last Updated:** 2026-02-03  
**Status:** Ready for Implementation
