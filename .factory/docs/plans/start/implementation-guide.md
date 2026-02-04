# Frame-Agent-Server Implementation Guide

**Version:** 1.0  
**Date:** 2026-02-03  
**Status:** Final  

---

## Overview

Este guia descreve a implementação do pacote npm `@ericnunes/frame-agent-server`, que **expõe grafos de execução (`GraphEngine`)** criados com `@ericnunes/frame-agent-sdk` via HTTP.

### Arquitetura de Pacotes

```
┌─────────────────────────────────────────────────────────────┐
│  @ericnunes/frame-agent-sdk    (peer dependency)            │
│  └── Cria e orquestra grafos (GraphEngine)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  @ericnunes/frame-agent-server   (este pacote)              │
│  ├── Biblioteca: serveGraph()                               │
│  └── CLI: frame-agent-server (futuro)                       │
│  └── ⚠️ NÃO cria grafos - apenas expõe                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- TypeScript 5+
- npm or yarn

### Project Setup (Para Desenvolvimento do Pacote)

```bash
# Navigate to server directory
cd frame-agent-server

# Initialize project
npm init -y

# Install dependencies
npm install fastify @fastify/cors
npm install dotenv pino cac
npm install -D typescript @types/node tsx

# Install dev dependencies
npm install -D jest @types/jest ts-jest

# SDK é peer dependency (instalado pelo usuário)
# npm install @ericnunes/frame-agent-sdk
```

### Package.json

```json
{
  "name": "@ericnunes/frame-agent-server",
  "version": "1.0.0",
  "description": "HTTP server for frame-agent-sdk GraphEngine",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "frame-agent-server": "dist/bin/cli.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "@ericnunes/frame-agent-sdk": "^1.0.0"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.0",
    "pino": "^9.0.0",
    "cac": "^6.7.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.5.0",
    "tsx": "^4.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  },
  "keywords": [
    "agent",
    "ai",
    "server",
    "fastify",
    "worker-threads"
  ],
  "author": "Eric Nunes",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/ericnunes30/frame-agent-server.git"
  }
}
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Project Structure

```
frame-agent-server/
├── src/
│   ├── server/
│   │   └── index.ts              # Server entry point
│   ├── routes/
│   │   └── execute.ts            # Execute routes
│   ├── workers/
│   │   ├── WorkerPool.ts         # Worker pool management
│   │   └── agent.worker.ts       # Worker thread script
│   ├── queue/
│   │   ├── JobQueue.ts           # In-memory job queue
│   │   └── JobStore.ts           # Job results store
│   ├── types/
│   │   └── index.ts              # Type definitions
│   └── utils/
│       └── logger.ts             # Logger utility
├── bin/
│   └── cli.ts                    # CLI entry point
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── jest.config.js
└── .env.example
```

---

## Phase 1: Core Implementation (Week 1)

### Step 1: Type Definitions

```typescript
// src/types/index.ts
import { Message } from '@ericnunes/frame-agent-sdk';

export interface Job {
  id: string;
  messages: Message[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ExecutionResult;
  error?: string;
}

export interface ExecutionResult {
  content: string | null;
  messages: Message[];
  success: boolean;
  error?: string;
  metadata?: any;
}

export interface ServerOptions {
  port?: number;
  workers?: number;
  jobTTL?: number; // milliseconds
  hyperdx?: {
    apiKey?: string;
    endpoint?: string;
  };
}
```

### Step 2: Job Queue (In-Memory)

```typescript
// src/queue/JobQueue.ts
import { Job } from '../types';
import { EventEmitter } from 'events';

export class JobQueue extends EventEmitter {
  private jobs = new Map<string, Job>();
  private queue: string[] = [];
  private running = new Set<string>();
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 4) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  add(messages: any[]): Job {
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
    if (!job) return undefined;

    job.status = 'running';
    job.startedAt = new Date();
    this.running.add(id);
    
    this.emit('job:started', job);
    return job;
  }

  completeJob(id: string, result: ExecutionResult): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    job.status = result.success ? 'completed' : 'failed';
    job.result = result;
    job.completedAt = new Date();
    this.running.delete(id);
    
    this.emit('job:completed', job);
    this.processQueue();
    
    return job;
  }

  private processQueue(): void {
    if (this.running.size >= this.maxConcurrent) return;
    if (this.queue.length === 0) return;

    const jobId = this.queue.shift();
    if (!jobId) return;

    this.emit('job:available', jobId);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      total: this.jobs.size
    };
  }
}
```

### Step 3: Worker Pool

```typescript
// src/workers/WorkerPool.ts
import { Worker } from 'worker_threads';
import { Job, ExecutionResult } from '../types';
import { JobQueue } from '../queue/JobQueue';
import { createLogger } from '../utils/logger';
import { join } from 'path';

const logger = createLogger('WorkerPool');

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private jobQueue: JobQueue;
  private agentConfig: any;
  private workerScript: string;

  constructor(agentConfig: any, maxWorkers: number = 4) {
    this.agentConfig = agentConfig;
    this.jobQueue = new JobQueue(maxWorkers);
    this.workerScript = join(__dirname, 'agent.worker.js');

    this.initializeWorkers(maxWorkers);
    this.setupQueueListeners();
  }

  private initializeWorkers(count: number): void {
    for (let i = 0; i < count; i++) {
      const worker = new Worker(this.workerScript, {
        workerData: { agentConfig: this.agentConfig }
      });

      worker.on('message', (result) => {
        this.handleWorkerMessage(worker, result);
      });

      worker.on('error', (error) => {
        logger.error({ error }, 'Worker error');
        this.replaceWorker(worker);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          logger.error({ code }, 'Worker exited with error');
          this.replaceWorker(worker);
        }
      });

      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }

    logger.info({ count }, 'Worker pool initialized');
  }

  private setupQueueListeners(): void {
    this.jobQueue.on('job:available', (jobId: string) => {
      this.executeJob(jobId);
    });
  }

  private async executeJob(jobId: string): Promise<void> {
    const worker = this.availableWorkers.shift();
    if (!worker) {
      // No workers available, job stays in queue
      return;
    }

    const job = this.jobQueue.startJob(jobId);
    if (!job) {
      this.availableWorkers.push(worker);
      return;
    }

    worker.postMessage({
      type: 'execute',
      jobId: job.id,
      messages: job.messages
    });
  }

  private handleWorkerMessage(worker: Worker, message: any): void {
    if (message.type === 'result') {
      this.jobQueue.completeJob(message.jobId, message.result);
      this.availableWorkers.push(worker);
    }
  }

  private replaceWorker(oldWorker: Worker): void {
    const index = this.workers.indexOf(oldWorker);
    if (index > -1) {
      this.workers.splice(index, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(oldWorker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }

    // Create new worker
    const worker = new Worker(this.workerScript, {
      workerData: { agentConfig: this.agentConfig }
    });
    this.workers.push(worker);
    this.availableWorkers.push(worker);
  }

  submit(messages: any[]): Job {
    return this.jobQueue.add(messages);
  }

  getJob(id: string): Job | undefined {
    return this.jobQueue.get(id);
  }

  getStats() {
    return {
      ...this.jobQueue.getStats(),
      workers: this.workers.length,
      availableWorkers: this.availableWorkers.length
    };
  }

  terminate(): Promise<void[]> {
    return Promise.all(this.workers.map(w => w.terminate()));
  }
}
```

### Step 4: Worker Thread Script

```typescript
// src/workers/graph.worker.ts
import { parentPort, workerData } from 'worker_threads';
import { GraphEngine } from '@ericnunes/frame-agent-sdk';

// Load graph from user file (exported as default or 'graph')
const graphModule = require(workerData.graphPath);
const graphEngine: GraphEngine = graphModule.default || graphModule.graph;

if (!graphEngine || typeof graphEngine.execute !== 'function') {
  throw new Error('Invalid GraphEngine: must have execute() method');
}

parentPort?.on('message', async (message) => {
  if (message.type === 'execute') {
    try {
      const result = await graphEngine.execute({
        messages: message.messages,
        data: {},
        metadata: {}
      });
      
      parentPort?.postMessage({
        type: 'result',
        jobId: message.jobId,
        result: {
          content: result.state.messages[result.state.messages.length - 1]?.content || null,
          messages: result.state.messages,
          success: result.status === 'FINISHED' || result.status === 'COMPLETED',
          error: result.status === 'ERROR' ? 'Graph execution failed' : undefined,
          metadata: {
            graphStatus: result.status
          }
        }
      });
    } catch (error) {
      parentPort?.postMessage({
        type: 'result',
        jobId: message.jobId,
        result: {
          content: null,
          messages: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
});
```

### Step 5: Fastify Routes

```typescript
// src/routes/execute.ts
import { FastifyInstance } from 'fastify';
import { WorkerPool } from '../workers/WorkerPool';

export async function executeRoutes(
  fastify: FastifyInstance,
  options: { workerPool: WorkerPool }
) {
  const { workerPool } = options;

  // POST /execute - Submit job
  fastify.post('/execute', async (request, reply) => {
    const { messages } = request.body as { messages: any[] };

    if (!messages || !Array.isArray(messages)) {
      return reply.status(400).send({
        error: 'Missing or invalid messages array'
      });
    }

    const job = workerPool.submit(messages);
    const stats = workerPool.getStats();

    return {
      jobId: job.id,
      status: job.status,
      position: stats.queued
    };
  });

  // GET /jobs/:id - Get job status/result
  fastify.get('/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = workerPool.getJob(id);

    if (!job) {
      return reply.status(404).send({
        error: 'Job not found'
      });
    }

    const response: any = {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt
    };

    if (job.startedAt) {
      response.startedAt = job.startedAt;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      response.completedAt = job.completedAt;
      response.durationMs = job.completedAt && job.startedAt 
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : undefined;
      response.result = job.result;
    }

    return response;
  });

  // GET /health - Health check
  fastify.get('/health', async () => {
    const stats = workerPool.getStats();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      stats
    };
  });
}
```

### Step 6: Server Entry Point

```typescript
// src/server/index.ts
import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { executeRoutes } from '../routes/execute';
import { WorkerPool } from '../workers/WorkerPool';
import { createLogger } from '../utils/logger';
import { GraphEngine } from '@ericnunes/frame-agent-sdk';

dotenv.config();

const logger = createLogger();

export interface ServeOptions {
  port?: number;
  workers?: number;
  jobTTL?: number;
  hyperdx?: {
    apiKey?: string;
    endpoint?: string;
  };
}

export async function serveGraph(graphEngine: GraphEngine, options: ServeOptions = {}) {
  const port = options.port || parseInt(process.env.PORT || '3000', 10);
  const maxWorkers = options.workers || parseInt(process.env.WORKERS || '4', 10);

  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  });

  // Register plugins
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || '*'
  });

  // Create worker pool with graphEngine
  const workerPool = new WorkerPool(graphEngine, maxWorkers);

  // Register routes
  await server.register(executeRoutes, {
    prefix: '/',
    workerPool
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await workerPool.terminate();
    await server.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await workerPool.terminate();
    await server.close();
    process.exit(0);
  });

  try {
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`Server running on http://localhost:${port}`);
    logger.info(`Worker pool: ${maxWorkers} workers`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  return server;
}
```

### Step 7: Logger Utility

```typescript
// src/utils/logger.ts
import pino from 'pino';

export function createLogger(name?: string): pino.Logger {
  return pino({
    name: name || 'frame-agent-server',
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined
  });
}
```

---

## Phase 2: CLI Implementation (Week 2) - FUTURO

> **Nota:** O CLI será implementado em fase futura (Fase 2). A Fase 1 foca apenas na biblioteca.

### CLI Entry Point (Futuro)

```typescript
// bin/cli.ts
#!/usr/bin/env node
import { cac } from 'cac';
import { serveAgent } from '../src/server';
import { createAgent } from '@ericnunes/frame-agent-sdk';
import { resolve } from 'path';

const cli = cac('frame-agent-server');

cli
  .command('[agent-file]', 'Start server with agent')
  .option('--port <port>', 'Server port', { default: 3000 })
  .option('--workers <workers>', 'Number of workers', { default: 4 })
  .option('--job-ttl <ttl>', 'Job result TTL in ms', { default: 3600000 })
  .action(async (agentFile: string, options) => {
    if (!agentFile) {
      console.error('Error: Agent file is required');
      process.exit(1);
    }

    try {
      // Load agent from file
      const agentPath = resolve(process.cwd(), agentFile);
      const agentModule = await import(agentPath);
      const agent = agentModule.default || agentModule.agent;

      if (!agent) {
        console.error('Error: Agent not found in file');
        process.exit(1);
      }

      console.log(`Starting server with agent: ${agentFile}`);
      console.log(`Port: ${options.port}, Workers: ${options.workers}`);

      await serveAgent(agent, {
        port: parseInt(options.port),
        workers: parseInt(options.workers),
        jobTTL: parseInt(options.jobTtl)
      });
    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  });

cli.help();
cli.parse();
```

---

## Phase 3: Docker & Deployment (Week 2)

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
ENV WORKERS=4

EXPOSE 3000

CMD ["node", "dist/agent.js"]
```

### Docker Compose (Swarm)

```yaml
# docker-compose.yml
version: '3.8'

services:
  agent:
    build: .
    environment:
      - PORT=3000
      - WORKERS=${WORKERS:-4}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    deploy:
      replicas: ${REPLICAS:-2}
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.${SERVICE_NAME}.rule=Host(`${DOMAIN}`)"
        - "traefik.http.services.${SERVICE_NAME}.loadbalancer.server.port=3000"
      resources:
        limits:
          cpus: '1'
          memory: 1G
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

### Example Graph File

```typescript
// src/index.ts
import { GraphEngine, createAgentNode } from '@ericnunes/frame-agent-sdk';
import { serveGraph } from '@ericnunes/frame-agent-server';

// Define the graph
const graph = new GraphEngine({
  nodes: {
    agent: createAgentNode({
      llm: { 
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY! 
      },
      mode: 'react',
      agentInfo: {
        name: process.env.AGENT_NAME || 'Meu Agente',
        role: 'Assistente',
        goal: 'Ajudar usuários',
        backstory: 'Um assistente útil'
      }
    })
  },
  edges: { agent: 'END' },
  entryPoint: 'agent'
});

// Server exposes the graph
serveGraph(graph, {
  port: parseInt(process.env.PORT || '3000'),
  workers: parseInt(process.env.WORKERS || '4')
});
```

---

## Testing

### Unit Test Example

```typescript
// tests/unit/JobQueue.test.ts
import { JobQueue } from '../../src/queue/JobQueue';

describe('JobQueue', () => {
  let queue: JobQueue;

  beforeEach(() => {
    queue = new JobQueue(2); // Max 2 concurrent
  });

  it('should add job to queue', () => {
    const job = queue.add([{ role: 'user', content: 'Hello' }]);
    expect(job.status).toBe('queued');
    expect(queue.getStats().queued).toBe(1);
  });

  it('should start job when available', (done) => {
    queue.on('job:available', (jobId) => {
      expect(jobId).toBeDefined();
      done();
    });

    queue.add([{ role: 'user', content: 'Hello' }]);
  });
});
```

### Integration Test Example

```typescript
// tests/integration/server.test.ts
import { serveGraph } from '../../src/server';

// Mock GraphEngine for testing
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

describe('Server API', () => {
  let server: any;

  beforeAll(async () => {
    const mockGraph = createMockGraphEngine();
    server = await serveGraph(mockGraph, { port: 0 }); // Random port
  });

  afterAll(async () => {
    await server.close();
  });

  it('POST /execute should return jobId', async () => {
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
});
```

---

## Environment Variables

```env
# .env.example
PORT=3000
WORKERS=4
JOB_TTL=3600000
LOG_LEVEL=info
CORS_ORIGIN=*

# SDK Configuration
OPENAI_API_KEY=sk-...

# Optional: HyperDX
HYPERDX_API_KEY=...
HYPERDX_ENDPOINT=https://api.hyperdx.io
```

---

## Usage Examples

### As Library

```typescript
// my-graph.ts
import { GraphEngine, createAgentNode } from '@ericnunes/frame-agent-sdk';
import { serveGraph } from '@ericnunes/frame-agent-server';

// Define the graph
const graph = new GraphEngine({
  nodes: {
    agent: createAgentNode({
      llm: { model: 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY! },
      mode: 'react',
      agentInfo: { name: 'Assistente', goal: 'Ajudar' }
    })
  },
  edges: { agent: 'END' },
  entryPoint: 'agent'
});

// Server exposes the graph
serveGraph(graph, {
  port: 3000,
  workers: 4
});
```

### As CLI

```bash
# Install globally
npm install -g @ericnunes/frame-agent-server

# Run with graph file
frame-agent-server ./dist/graph.js --port 3000 --workers 4

# Or with npx
npx @ericnunes/frame-agent-server ./dist/graph.js
```

### Client Usage

```bash
# Submit job
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Olá!"}]}'

# Response: {"jobId": "abc-123", "status": "queued", "position": 0}

# Poll for result
curl http://localhost:3000/jobs/abc-123

# Response: {"jobId": "abc-123", "status": "completed", "result": {...}}
```

---

## Next Steps

1. Implement Phase 1 (Core)
2. Add comprehensive tests
3. Implement CLI
4. Create GitHub template
5. Add Docker support
6. Write documentation

---

## References

- Fastify Documentation: https://www.fastify.io/
- Node.js Worker Threads: https://nodejs.org/api/worker_threads.html
- frame-agent-sdk: https://github.com/ericnunes30/frame-agent-sdk
