import { WorkerPool } from '../../../src/workers/WorkerPool';
import { resolve } from 'path';

describe('WorkerPool', () => {
  let pool: WorkerPool;
  const mockGraphPath = resolve(__dirname, '../../fixtures/mock-graph.js');

  beforeEach(() => {
    pool = new WorkerPool(mockGraphPath, {
      maxWorkers: 2,
      jobTTL: 60000,
      maxQueueSize: 10,
      cleanupIntervalMs: 1000
    });
  });

  afterEach(async () => {
    jest.setTimeout(10000);
    await pool.terminate();
  });

  describe('constructor', () => {
    it('should create workers on initialization', () => {
      const stats = pool.getStats();
      expect(stats.workers).toBe(2);
      expect(stats.availableWorkers).toBe(2);
    });
  });

  describe('submit', () => {
    it('should create a job and return it', () => {
      const job = pool.submit([{ role: 'user', content: 'Hello' }]);
      
      expect(job.id).toBeDefined();
      expect(['queued', 'running']).toContain(job.status);
      expect(job.messages).toHaveLength(1);
    });

    it('should queue multiple jobs', () => {
      const job1 = pool.submit([{ role: 'user', content: '1' }]);
      const job2 = pool.submit([{ role: 'user', content: '2' }]);
      const job3 = pool.submit([{ role: 'user', content: '3' }]);

      expect(pool.getQueuePosition(job1.id)).toBeGreaterThanOrEqual(-1);
      expect(pool.getQueuePosition(job2.id)).toBeGreaterThanOrEqual(-1);
      expect(pool.getQueuePosition(job3.id)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getJob', () => {
    it('should return job by id', () => {
      const job = pool.submit([{ role: 'user', content: 'Hello' }]);
      const retrieved = pool.getJob(job.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(job.id);
    });

    it('should return undefined for non-existent job', () => {
      const retrieved = pool.getJob('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return pool statistics', () => {
      pool.submit([{ role: 'user', content: '1' }]);
      pool.submit([{ role: 'user', content: '2' }]);

      const stats = pool.getStats();

      expect(stats).toHaveProperty('queued');
      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('workers');
      expect(stats).toHaveProperty('availableWorkers');
      expect(stats.workers).toBe(2);
    });
  });

  describe('terminate', () => {
    it('should terminate all workers', async () => {
      pool.submit([{ role: 'user', content: 'Hello' }]);
      
      await pool.terminate();
      
      const stats = pool.getStats();
      expect(stats.availableWorkers).toBe(0);
    });
  });
});
