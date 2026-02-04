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
