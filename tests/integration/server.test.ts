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
    // Use workers: 0 to disable worker threads in tests
    // This prevents MODULE_NOT_FOUND errors and keeps jobs in 'queued' status
    server = await serveGraph(mockGraph, { 
      port: 0,
      workers: 0,
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
      expect(body.stats.workers).toBe(0);
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
