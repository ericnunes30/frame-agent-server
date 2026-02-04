import { JobManager } from '../../../src/manager/JobManager';
import { Message } from '../../../src/types';

describe('JobManager', () => {
  let manager: JobManager;

  const createMessage = (content: string): Message => ({
    role: 'user',
    content
  });

  beforeEach(() => {
    manager = new JobManager(2, {
      ttlMs: 60000,
      cleanupIntervalMs: 1000,
      maxQueueSize: 10
    });
  });

  afterEach(() => {
    manager.stopCleanup();
    manager.clear();
  });

  describe('add', () => {
    it('should create a job with queued status', () => {
      const job = manager.add([createMessage('Hello')]);
      
      expect(job.id).toBeDefined();
      expect(job.status).toBe('queued');
      expect(job.messages).toHaveLength(1);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('should throw when queue is full', () => {
      const smallManager = new JobManager(1, {
        ttlMs: 60000,
        cleanupIntervalMs: 1000,
        maxQueueSize: 2
      });

      smallManager.add([createMessage('1')]);
      smallManager.add([createMessage('2')]);

      expect(() => {
        smallManager.add([createMessage('3')]);
      }).toThrow('Queue is full');

      smallManager.stopCleanup();
    });

    it('should throw when too many messages', () => {
      const messages = Array(101).fill(null).map((_, i) => createMessage(`Message ${i}`));
      
      expect(() => {
        manager.add(messages);
      }).toThrow('Too many messages');
    });

    it('should throw when message content is too large', () => {
      const largeContent = 'x'.repeat(10 * 1024 + 1); // 10KB + 1 byte
      
      expect(() => {
        manager.add([createMessage(largeContent)]);
      }).toThrow('Message content too large');
    });

    it('should emit job:queued event', (done) => {
      manager.once('job:queued', (job) => {
        expect(job.messages[0].content).toBe('Test');
        done();
      });

      manager.add([createMessage('Test')]);
    });
  });

  describe('startJob', () => {
    it('should transition job to running status', () => {
      const job = manager.add([createMessage('Hello')]);
      const started = manager.startJob(job.id);

      expect(started).toBeDefined();
      expect(started?.status).toBe('running');
      expect(started?.startedAt).toBeInstanceOf(Date);
    });

    it('should remove job from queue when started', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);
      
      expect(manager.getQueuePosition(job1.id)).toBe(0);
      expect(manager.getQueuePosition(job2.id)).toBe(1);

      manager.startJob(job1.id);

      expect(manager.getQueuePosition(job1.id)).toBe(-1);
      expect(manager.getQueuePosition(job2.id)).toBe(0);
    });

    it('should return undefined for non-existent job', () => {
      const result = manager.startJob('non-existent');
      expect(result).toBeUndefined();
    });

    it('should emit job:started event', (done) => {
      const job = manager.add([createMessage('Hello')]);
      
      manager.once('job:started', (startedJob) => {
        expect(startedJob.id).toBe(job.id);
        expect(startedJob.status).toBe('running');
        done();
      });

      manager.startJob(job.id);
    });
  });

  describe('completeJob', () => {
    it('should transition job to completed status on success', () => {
      const job = manager.add([createMessage('Hello')]);
      manager.startJob(job.id);

      const completed = manager.completeJob(job.id, {
        content: 'Response',
        messages: [createMessage('Hello'), { role: 'assistant', content: 'Response' }],
        success: true
      });

      expect(completed).toBeDefined();
      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeInstanceOf(Date);
    });

    it('should transition job to failed status on error', () => {
      const job = manager.add([createMessage('Hello')]);
      manager.startJob(job.id);

      const completed = manager.completeJob(job.id, {
        content: null,
        messages: [createMessage('Hello')],
        success: false,
        error: 'Something went wrong'
      });

      expect(completed?.status).toBe('failed');
      expect(completed?.error).toBe('Something went wrong');
    });

    it('should return undefined for non-existent job', () => {
      const result = manager.completeJob('non-existent', { content: null, messages: [], success: false });
      expect(result).toBeUndefined();
    });

    it('should return undefined for job not in running status', () => {
      const job = manager.add([createMessage('Hello')]);
      // Don't start the job, try to complete it directly
      const result = manager.completeJob(job.id, { content: null, messages: [], success: false });
      expect(result).toBeUndefined();
    });

    it('should emit job:completed event', (done) => {
      const job = manager.add([createMessage('Hello')]);
      manager.startJob(job.id);

      manager.once('job:completed', (completedJob) => {
        expect(completedJob.id).toBe(job.id);
        expect(completedJob.status).toBe('completed');
        done();
      });

      manager.completeJob(job.id, {
        content: 'Done',
        messages: [],
        success: true
      });
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);
      const job3 = manager.add([createMessage('3')]);

      manager.startJob(job1.id);
      manager.completeJob(job1.id, { content: 'Done', messages: [], success: true });

      manager.startJob(job2.id);
      manager.completeJob(job2.id, { content: null, messages: [], success: false, error: 'Failed' });

      const stats = manager.getStats();

      expect(stats.queued).toBe(1);
      expect(manager.get(job3.id)).toBeDefined(); // job3 is still tracked
      expect(stats.running).toBe(0);
      expect(stats.completed).toBe(1); // job1
      expect(stats.failed).toBe(1); // job2
      expect(stats.total).toBe(3);
    });
  });

  describe('getQueuePosition', () => {
    it('should return correct position', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);
      const job3 = manager.add([createMessage('3')]);

      expect(manager.getQueuePosition(job1.id)).toBe(0);
      expect(manager.getQueuePosition(job2.id)).toBe(1);
      expect(manager.getQueuePosition(job3.id)).toBe(2);
    });

    it('should return -1 for job not in queue', () => {
      const job = manager.add([createMessage('Hello')]);
      manager.startJob(job.id);

      expect(manager.getQueuePosition(job.id)).toBe(-1);
    });
  });

  describe('cleanup', () => {
    it('should remove old completed jobs', (done) => {
      const shortTTLManager = new JobManager(2, {
        ttlMs: 100, // 100ms TTL
        cleanupIntervalMs: 50,
        maxQueueSize: 10
      });

      const job = shortTTLManager.add([createMessage('Hello')]);
      shortTTLManager.startJob(job.id);
      shortTTLManager.completeJob(job.id, { content: 'Done', messages: [], success: true });

      shortTTLManager.once('cleanup', () => {
        expect(shortTTLManager.get(job.id)).toBeUndefined();
        shortTTLManager.stopCleanup();
        done();
      });
    });

    it('should handle processQueue when queue is empty', () => {
      // Create a manager with maxConcurrent = 1 and add/complete a job
      const singleWorkerManager = new JobManager(1, {
        ttlMs: 60000,
        cleanupIntervalMs: 1000,
        maxQueueSize: 10
      });

      const job = singleWorkerManager.add([createMessage('Hello')]);
      singleWorkerManager.startJob(job.id);
      // After completing, queue is empty - processQueue should handle this gracefully
      singleWorkerManager.completeJob(job.id, { content: 'Done', messages: [], success: true });

      // Verify the job is completed and no errors occurred
      expect(singleWorkerManager.get(job.id)?.status).toBe('completed');
      expect(singleWorkerManager.getStats().queued).toBe(0);

      singleWorkerManager.stopCleanup();
    });
  });

  describe('getRunningJobIds', () => {
    it('should return empty array when no jobs running', () => {
      expect(manager.getRunningJobIds()).toEqual([]);
    });

    it('should return IDs of running jobs', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);

      manager.startJob(job1.id);
      manager.startJob(job2.id);

      const runningIds = manager.getRunningJobIds();
      expect(runningIds).toContain(job1.id);
      expect(runningIds).toContain(job2.id);
      expect(runningIds).toHaveLength(2);
    });
  });

  describe('getRunningJobsCount', () => {
    it('should return 0 when no jobs running', () => {
      expect(manager.getRunningJobsCount()).toBe(0);
    });

    it('should return correct count of running jobs', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);

      expect(manager.getRunningJobsCount()).toBe(0);

      manager.startJob(job1.id);
      expect(manager.getRunningJobsCount()).toBe(1);

      manager.startJob(job2.id);
      expect(manager.getRunningJobsCount()).toBe(2);

      manager.completeJob(job1.id, { content: 'Done', messages: [], success: true });
      expect(manager.getRunningJobsCount()).toBe(1);
    });
  });

  describe('getQueuedJobIds', () => {
    it('should return empty array when queue is empty', () => {
      expect(manager.getQueuedJobIds()).toEqual([]);
    });

    it('should return IDs of queued jobs in order', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);

      const queuedIds = manager.getQueuedJobIds();
      expect(queuedIds).toEqual([job1.id, job2.id]);
    });

    it('should not include started jobs', () => {
      const job1 = manager.add([createMessage('1')]);
      const job2 = manager.add([createMessage('2')]);

      manager.startJob(job1.id);

      const queuedIds = manager.getQueuedJobIds();
      expect(queuedIds).toEqual([job2.id]);
      expect(queuedIds).not.toContain(job1.id);
    });
  });
});
