# Fase 1 - Day 4: Fastify Server & Routes

**Fase:** 1 - Core Library  
**Dia:** 4  
**Status:** Pronto para implementação  
**Tempo estimado:** 8-10 horas

---

## Objetivo

Configurar Fastify com plugins, implementar endpoints com JSON schemas e criar a interface `serveGraph()`.

---

## Tarefas

### 4.1 Configurar Fastify
- [ ] Criar servidor Fastify com plugins
- [ ] Configurar CORS
- [ ] Configurar rate limiting
- [ ] Configurar error handler global

### 4.2 Implementar Rotas
- [ ] Criar rota `POST /execute` com validação
- [ ] Criar rota `GET /jobs/:id` para status
- [ ] Criar rota `GET /health` para health check
- [ ] Definir JSON schemas para validação

### 4.3 Implementar serveGraph
- [ ] Criar função `serveGraph(graphEngine, options)`
- [ ] Validar GraphEngine
- [ ] Integrar WorkerPool
- [ ] Implementar graceful shutdown

### 4.4 Criar Entry Point
- [ ] Exportar `serveGraph` em `src/index.ts`
- [ ] Configurar exports do pacote

---

## Arquivos a Criar

### src/server/index.ts
```typescript
import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { WorkerPool } from '../workers/WorkerPool';
import { executeRoutes } from '../routes/execute';
import { healthRoutes } from '../routes/health';
import { createLogger } from '../utils/logger';
import { ServerOptions, IGraphEngine } from '../types';

dotenv.config();

const logger = createLogger('Server');

export interface ServeGraphOptions extends ServerOptions {
  cors?: {
    origin?: string | string[];
  };
}

/**
 * Inicia o servidor HTTP com o GraphEngine
 * 
 * @param graphEngine - Instância do GraphEngine do SDK
 * @param options - Opções de configuração do servidor
 * @returns Instância do servidor Fastify
 * 
 * @example
 * ```typescript
 * import { serveGraph } from '@ericnunes/frame-agent-server';
 * import { createGraph } from './graph';
 * 
 * const graph = createGraph();
 * const server = await serveGraph(graph, { port: 3000 });
 * ```
 */
export async function serveGraph(
  graphEngine: IGraphEngine, 
  options: ServeGraphOptions = {}
): Promise<FastifyInstance> {
  const port = options.port || parseInt(process.env.PORT || '3000', 10);
  const maxWorkers = options.workers || parseInt(process.env.WORKERS || '4', 10);
  const jobTTL = options.jobTTL || parseInt(process.env.JOB_TTL || '3600000', 10);
  const maxQueueSize = options.maxQueueSize || parseInt(process.env.MAX_QUEUE_SIZE || '100', 10);
  const shutdownTimeout = options.shutdownTimeout || parseInt(process.env.SHUTDOWN_TIMEOUT || '60000', 10);
  const startTime = Date.now();

  // Validar que é um GraphEngine válido
  if (!graphEngine || typeof graphEngine.execute !== 'function') {
    throw new Error('Invalid GraphEngine: must have execute() method');
  }

  const server = fastify({
    logger: createLogger('Fastify')
  });

  // Plugins
  await server.register(cors, {
    origin: options.cors?.origin || process.env.CORS_ORIGIN || '*'
  });

  await server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10)
  });

  // Worker Pool
  // Para o servidor, precisamos passar o caminho do módulo que exporta o grafo
  // Em uma implementação real, isso seria configurável
  const graphPath = process.env.GRAPH_PATH || './graph.js';
  
  const workerPool = new WorkerPool(graphPath, {
    maxWorkers,
    jobTTL,
    maxQueueSize,
    cleanupIntervalMs: 60000
  });

  // Rotas
  await server.register(executeRoutes, { prefix: '/', workerPool });
  await server.register(healthRoutes, { prefix: '/', workerPool, startTime });

  // Error handler global
  server.setErrorHandler((error, request, reply) => {
    logger.error({ error, requestId: request.id }, 'Request error');
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal server error'
    });
  });

  // Not found handler
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not found',
      path: request.url,
      method: request.method
    });
  });

  // Graceful shutdown
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

  // Start server
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

### src/routes/execute.ts
```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { WorkerPool } from '../workers/WorkerPool';
import { ExecuteResponse, JobStatusResponse } from '../types';

interface RouteOptions extends FastifyPluginOptions {
  workerPool: WorkerPool;
}

// JSON Schema para validação
const executeSchema = {
  description: 'Submit a new job for graph execution',
  tags: ['execution'],
  body: {
    type: 'object',
    required: ['messages'],
    properties: {
      messages: {
        type: 'array',
        items: {
          type: 'object',
          required: ['role', 'content'],
          properties: {
            role: { 
              type: 'string', 
              enum: ['user', 'assistant', 'system'] 
            },
            content: { type: 'string', minLength: 1 }
          }
        },
        minItems: 1
      },
      metadata: {
        type: 'object',
        additionalProperties: true
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed'] },
        position: { type: 'number' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

const jobStatusSchema = {
  description: 'Get job status and result',
  tags: ['execution'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9]+-[a-z0-9]+$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        startedAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time' },
        durationMs: { type: 'number' },
        result: {
          type: 'object',
          properties: {
            content: { type: ['string', 'null'] },
            success: { type: 'boolean' },
            error: { type: 'string' },
            metadata: { type: 'object' }
          }
        }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

/**
 * Rotas de execução de grafos
 */
export async function executeRoutes(
  server: FastifyInstance, 
  options: RouteOptions
): Promise<void> {
  const { workerPool } = options;

  // POST /execute - Cria um novo job
  server.post<{ 
    Body: { messages: Array<{ role: string; content: string }>; metadata?: any };
    Reply: ExecuteResponse;
  }>('/execute', { schema: executeSchema }, async (request, reply) => {
    try {
      const { messages, metadata } = request.body;

      // Validar mensagens
      if (!Array.isArray(messages) || messages.length === 0) {
        return reply.status(400).send({ error: 'Messages array is required' });
      }

      for (const msg of messages) {
        if (!msg.role || !msg.content) {
          return reply.status(400).send({ error: 'Each message must have role and content' });
        }
        if (!['user', 'assistant', 'system'].includes(msg.role)) {
          return reply.status(400).send({ error: `Invalid role: ${msg.role}` });
        }
      }

      // Criar job
      const job = workerPool.submit(messages);
      const position = workerPool.getQueuePosition(job.id);

      const response: ExecuteResponse = {
        jobId: job.id,
        status: job.status,
        position: position === -1 ? 0 : position
      };

      return reply.status(200).send(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Queue is full')) {
        return reply.status(429).send({ error: 'Queue is full, try again later' });
      }
      throw error;
    }
  });

  // GET /jobs/:id - Retorna status do job
  server.get<{
    Params: { id: string };
    Reply: JobStatusResponse | { error: string };
  }>('/jobs/:id', { schema: jobStatusSchema }, async (request, reply) => {
    const { id } = request.params;
    const job = workerPool.getJob(id);

    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    const response: JobStatusResponse = {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      durationMs: job.completedAt && job.startedAt 
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : job.startedAt 
          ? Date.now() - job.startedAt.getTime()
          : undefined,
      result: job.result
    };

    return reply.status(200).send(response);
  });
}
```

### src/routes/health.ts
```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { WorkerPool } from '../workers/WorkerPool';
import { HealthResponse } from '../types';

interface RouteOptions extends FastifyPluginOptions {
  workerPool: WorkerPool;
  startTime: number;
}

// JSON Schema para validação
const healthSchema = {
  description: 'Health check endpoint',
  tags: ['health'],
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        stats: {
          type: 'object',
          properties: {
            queued: { type: 'number' },
            running: { type: 'number' },
            completed: { type: 'number' },
            failed: { type: 'number' },
            total: { type: 'number' },
            workers: { type: 'number' },
            availableWorkers: { type: 'number' }
          }
        }
      }
    }
  }
};

/**
 * Rotas de health check
 */
export async function healthRoutes(
  server: FastifyInstance, 
  options: RouteOptions
): Promise<void> {
  const { workerPool, startTime } = options;

  // GET /health - Health check
  server.get<{ Reply: HealthResponse }>('/health', { schema: healthSchema }, async () => {
    const stats = workerPool.getStats();
    const uptime = Date.now() - startTime;

    // Determinar status baseado nas estatísticas
    let status: 'ok' | 'degraded' | 'error' = 'ok';
    
    if (stats.availableWorkers === 0) {
      status = 'error';
    } else if (stats.availableWorkers < stats.workers / 2) {
      status = 'degraded';
    } else if (stats.queued > stats.workers * 5) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      stats
    };
  });

  // GET /ready - Readiness probe (para Kubernetes)
  server.get('/ready', async (_, reply) => {
    const stats = workerPool.getStats();
    
    if (stats.availableWorkers === 0) {
      return reply.status(503).send({ ready: false, reason: 'No available workers' });
    }
    
    return reply.status(200).send({ ready: true });
  });

  // GET /live - Liveness probe (para Kubernetes)
  server.get('/live', async () => {
    return { alive: true };
  });
}
```

### src/index.ts
```typescript
/**
 * Frame Agent Server
 * 
 * HTTP server for exposing GraphEngine execution graphs
 * 
 * @example
 * ```typescript
 * import { serveGraph } from '@ericnunes/frame-agent-server';
 * import { createGraph } from './graph';
 * 
 * const graph = createGraph();
 * await serveGraph(graph, { port: 3000 });
 * ```
 */

// Main export
export { serveGraph, ServeGraphOptions } from './server';

// Types
export {
  JobStatus,
  Message,
  Job,
  JobResult,
  ServerOptions,
  ExecuteResponse,
  JobStatusResponse,
  HealthResponse,
  IGraphEngine
} from './types';

// Manager
export { JobManager, JobManagerStats, JobManagerOptions } from './manager/JobManager';

// Workers
export { WorkerPool, WorkerPoolOptions } from './workers/WorkerPool';

// Utils
export { createLogger, logger } from './utils/logger';

// Version
export const VERSION = '1.0.0';
```

---

## Testes de Integração

### tests/integration/server.test.ts
```typescript
import { serveGraph } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Server Integration', () => {
  let server: FastifyInstance;

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

  beforeAll(async () => {
    const mockGraph = createMockGraphEngine();
    server = await serveGraph(mockGraph, { 
      port: 0,
      workers: 2,
      jobTTL: 60000,
      maxQueueSize: 10
    });
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /execute', () => {
    it('should create a job', async () => {
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
      expect(typeof body.position).toBe('number');
    });

    it('should return 400 for invalid messages', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/execute',
        payload: {
          messages: []
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid role', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/execute',
        payload: {
          messages: [{ role: 'invalid', content: 'Hello' }]
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /jobs/:id', () => {
    it('should return job status', async () => {
      // Criar job primeiro
      const createResponse = await server.inject({
        method: 'POST',
        url: '/execute',
        payload: {
          messages: [{ role: 'user', content: 'Hello' }]
        }
      });

      const { jobId } = JSON.parse(createResponse.body);

      // Buscar status
      const response = await server.inject({
        method: 'GET',
        url: `/jobs/${jobId}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.jobId).toBe(jobId);
      expect(body.status).toBeDefined();
      expect(body.createdAt).toBeDefined();
    });

    it('should return 404 for non-existent job', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/jobs/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeDefined();
      expect(body.stats).toBeDefined();
      expect(body.stats.workers).toBe(2);
    });
  });

  describe('GET /ready', () => {
    it('should return ready status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ready'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ready).toBe(true);
    });
  });

  describe('GET /live', () => {
    it('should return alive status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/live'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.alive).toBe(true);
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/unknown-route'
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
```

---

## Notas de Implementação

1. **serveGraph é a API principal** - Usuário chama com GraphEngine e opções
2. **Validação com JSON Schema** - Fastify valida automaticamente
3. **Graceful shutdown** - Aguarda jobs em execução antes de fechar
4. **Health endpoints** - `/health`, `/ready`, `/live` para monitoring
5. **Error handler global** - Captura erros não tratados

---

## Critérios de Conclusão

- [ ] Servidor Fastify configurado com plugins
- [ ] Rotas `/execute`, `/jobs/:id`, `/health` implementadas
- [ ] JSON schemas para validação definidos
- [ ] `serveGraph()` exportada como API principal
- [ ] Graceful shutdown implementado
- [ ] Testes de integração passando
- [ ] `npm test` passa sem erros

---

## Próximo Passo

Após completar este dia, prossiga para: **Fase 1 - Day 5: Integration & Testing**
