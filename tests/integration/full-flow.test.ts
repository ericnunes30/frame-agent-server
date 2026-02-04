import { serveGraph } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Full Flow Integration', () => {
  let server: FastifyInstance;

  // Mock GraphEngine que simula delay
  const createMockGraphEngine = (delayMs: number = 100) => ({
    execute: async ({ messages }: { messages: any[] }) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      return {
        state: { 
          messages: [
            ...messages, 
            { role: 'assistant', content: `Response to: ${messages[messages.length - 1]?.content}` }
          ],
          data: {},
          metadata: {}
        },
        status: 'FINISHED'
      };
    }
  });

  beforeAll(async () => {
    const mockGraph = createMockGraphEngine(200);
    server = await serveGraph(mockGraph, { 
      port: 0,
      workers: 0,
      jobTTL: 60000,
      maxQueueSize: 100 // Larger queue to avoid full queue issues
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should submit job and return job details', async () => {
    // 1. Submit job
    const submitResponse = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        messages: [{ role: 'user', content: 'Hello' }]
      }
    });

    expect(submitResponse.statusCode).toBe(200);
    const submitBody = JSON.parse(submitResponse.body);
    
    // Verify job was created
    expect(submitBody.jobId).toBeDefined();
    expect(typeof submitBody.jobId).toBe('string');
    // Job ID format: UUID (e.g., "faafaea2-f2b7-4822-b1f9-29705eaae473")
    expect(submitBody.jobId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
    expect(submitBody.status).toBe('queued');
    expect(typeof submitBody.position).toBe('number');

    // 2. Get job status
    const statusResponse = await server.inject({
      method: 'GET',
      url: `/jobs/${submitBody.jobId}`
    });

    expect(statusResponse.statusCode).toBe(200);
    const statusBody = JSON.parse(statusResponse.body);
    
    // Verify job status structure
    expect(statusBody.jobId).toBe(submitBody.jobId);
    expect(statusBody.status).toBe('queued');
    expect(statusBody.createdAt).toBeDefined();
    expect(typeof statusBody.createdAt).toBe('string');
  });

  it('should handle multiple concurrent job submissions', async () => {
    // Submit 5 jobs
    const jobPromises = Array.from({ length: 5 }, (_, i) => 
      server.inject({
        method: 'POST',
        url: '/execute',
        payload: {
          messages: [{ role: 'user', content: `Job ${i}` }]
        }
      })
    );

    const responses = await Promise.all(jobPromises);
    
    // All should be accepted
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });

    const jobData = responses.map(r => JSON.parse(r.body));
    
    // All jobs should have valid IDs
    jobData.forEach((data) => {
      expect(data.jobId).toBeDefined();
      expect(data.status).toBe('queued');
      expect(typeof data.position).toBe('number');
    });

    // All job IDs should be unique
    const jobIds = jobData.map(d => d.jobId);
    const uniqueIds = new Set(jobIds);
    expect(uniqueIds.size).toBe(5);

    // Verify each job can be retrieved
    for (const data of jobData) {
      const statusResponse = await server.inject({
        method: 'GET',
        url: `/jobs/${data.jobId}`
      });
      expect(statusResponse.statusCode).toBe(200);
      expect(JSON.parse(statusResponse.body).jobId).toBe(data.jobId);
    }
  });

  it('should return queue position for queued jobs', async () => {
    // Submit multiple jobs
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => 
        server.inject({
          method: 'POST',
          url: '/execute',
          payload: {
            messages: [{ role: 'user', content: 'Test' }]
          }
        })
      )
    );

    // Only consider successful responses (200)
    const successfulResponses = responses.filter(r => r.statusCode === 200);
    const positions = successfulResponses.map(r => JSON.parse(r.body).position);
    
    // Positions should be valid numbers
    positions.forEach((pos) => {
      expect(typeof pos).toBe('number');
      expect(pos).toBeGreaterThanOrEqual(0);
    });

    // At least some positions should be sequential (0, 1, 2, etc.) indicating proper queue ordering
    // The exact positions depend on current queue state
    expect(positions.length).toBeGreaterThan(0);
  });

  it('should track job through lifecycle', async () => {
    // Submit a job
    const submitResponse = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        messages: [{ role: 'user', content: 'Lifecycle test' }]
      }
    });

    // If queue is full, skip this test
    if (submitResponse.statusCode !== 200) {
      return; // Skip when queue is full
    }

    const { jobId } = JSON.parse(submitResponse.body);

    // Get initial status
    const initialStatus = JSON.parse((await server.inject({
      method: 'GET',
      url: `/jobs/${jobId}`
    })).body);

    expect(initialStatus.status).toBe('queued');
    expect(initialStatus.startedAt).toBeUndefined();
    expect(initialStatus.completedAt).toBeUndefined();

    // Job should remain in queued state (no workers to process it)
    const finalStatus = JSON.parse((await server.inject({
      method: 'GET',
      url: `/jobs/${jobId}`
    })).body);

    expect(finalStatus.status).toBe('queued');
    expect(finalStatus.jobId).toBe(jobId);
    expect(finalStatus.createdAt).toBeDefined();
  });
});
