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
    
    // Only consider workers unavailable as error if workers were configured (> 0)
    if (stats.workers > 0 && stats.availableWorkers === 0) {
      status = 'error';
    } else if (stats.workers > 0 && stats.availableWorkers < stats.workers / 2) {
      status = 'degraded';
    } else if (stats.workers > 0 && stats.queued > stats.workers * 5) {
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
    
    // Only consider no workers as not ready if workers were configured (> 0)
    if (stats.workers > 0 && stats.availableWorkers === 0) {
      return reply.status(503).send({ ready: false, reason: 'No available workers' });
    }
    
    return reply.status(200).send({ ready: true });
  });

  // GET /live - Liveness probe (para Kubernetes)
  server.get('/live', async () => {
    return { alive: true };
  });
}
