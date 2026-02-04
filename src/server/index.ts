import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import dotenv from 'dotenv';
import { resolve, isAbsolute } from 'path';
import { WorkerPool } from '../workers/WorkerPool';
import { executeRoutes } from '../routes/execute';
import { healthRoutes } from '../routes/health';
import { createLogger } from '../utils/logger';
import { IGraphEngine } from '../types';

dotenv.config();

const logger = createLogger('Server');

export interface ServeGraphOptions {
  port?: number;
  workers?: number;
  jobTTL?: number;
  maxQueueSize?: number;
  shutdownTimeout?: number;
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
  const port = options.port !== undefined ? options.port : parseInt(process.env.PORT || '3000', 10);
  const maxWorkers = typeof options.workers === 'number' ? options.workers : parseInt(process.env.WORKERS || '4', 10);
  const jobTTL = options.jobTTL || parseInt(process.env.JOB_TTL || '3600000', 10);
  const maxQueueSize = options.maxQueueSize || parseInt(process.env.MAX_QUEUE_SIZE || '100', 10);
  const shutdownTimeout = options.shutdownTimeout || parseInt(process.env.SHUTDOWN_TIMEOUT || '60000', 10);
  const startTime = Date.now();

  // Validar que é um GraphEngine válido
  if (!graphEngine || typeof graphEngine.execute !== 'function') {
    throw new Error('Invalid GraphEngine: must have execute() method');
  }

  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  });

  // Plugins
  await server.register(cors, {
    origin: options.cors?.origin || process.env.CORS_ORIGIN || (
      process.env.NODE_ENV === 'production' 
        ? []  // Deny all in production if not configured
        : '*'  // Allow all in development
    )
  });

  // Register rate-limit
  await server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10)
  });

  // Worker Pool
  // Para o servidor, precisamos passar o caminho do módulo que exporta o grafo
  // Em uma implementação real, isso seria configurável
  const rawGraphPath = process.env.GRAPH_PATH || './graph.js';
  const graphPath = isAbsolute(rawGraphPath) 
    ? rawGraphPath 
    : resolve(process.cwd(), rawGraphPath);

  // Basic validation - ensure it's a .js or .ts file
  if (!/\.(js|ts)$/.test(graphPath)) {
    throw new Error('GRAPH_PATH must be a .js or .ts file');
  }

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
  server.setErrorHandler((error: unknown, request, reply) => {
    const err = error as Error;
    logger.error({ error: err, requestId: request.id }, 'Request error');
    
    // In production, return generic error message
    const isProduction = process.env.NODE_ENV === 'production';
    reply.status((err as any).statusCode || 500).send({
      error: isProduction ? 'Internal server error' : (err.message || 'Internal server error')
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

    // Start shutdown timeout immediately
    const shutdownTimer = setTimeout(() => {
      logger.error({ runningJobs }, `Forced shutdown - ${runningJobs} jobs were still running`);
      process.exit(1);
    }, shutdownTimeout);

    // Perform graceful shutdown
    try {
      await server.close();
      await workerPool.terminate();
      logger.info('Server closed');
      clearTimeout(shutdownTimer);  // Cancel forced shutdown
      process.exit(0);
    } catch (error) {
      logger.error(error, 'Error during shutdown');
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
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
