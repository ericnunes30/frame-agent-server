import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { WorkerPool } from '../workers/WorkerPool';
import { ExecuteResponse, JobStatusResponse, Message } from '../types';

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
            content: { type: 'string', minLength: 1, maxLength: 10000 }
          }
        },
        minItems: 1
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
      id: { type: 'string' }
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
    Body: { messages: Message[]; metadata?: any };
    Reply: ExecuteResponse | { error: string };
  }>('/execute', { schema: executeSchema }, async (request, reply) => {
    try {
      const { messages } = request.body;

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
