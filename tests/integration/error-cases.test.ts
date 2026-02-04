import { serveGraph } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Error Cases Integration', () => {
  let server: FastifyInstance;

  const createMockGraphEngine = () => ({
    execute: async ({ messages }: { messages: any[] }) => ({
      state: { 
        messages: [...messages, { role: 'assistant', content: 'Mock' }],
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
      workers: 0,
      jobTTL: 60000,
      maxQueueSize: 2 // Small queue for testing
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 400 for missing messages', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for empty messages array', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: { messages: [] }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for invalid message format', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        messages: [{ role: 'user' }] // missing content
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for invalid role', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        messages: [{ role: 'bot', content: 'Hello' }]
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 for non-existent job', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/jobs/invalid-id-format'
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 429 when queue is full', async () => {
    // Fill the queue
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        server.inject({
          method: 'POST',
          url: '/execute',
          payload: {
            messages: [{ role: 'user', content: `Fill ${i}` }]
          }
        }).catch(() => null)
      );
    }

    const responses = await Promise.all(promises);
    
    // At least one should be 429
    const has429 = responses.some(r => r?.statusCode === 429);
    expect(has429).toBe(true);
  });

  it('should return 404 for unknown routes', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/unknown'
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Not found');
  });
});
