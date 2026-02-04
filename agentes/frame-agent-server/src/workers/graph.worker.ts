import { parentPort, workerData } from 'worker_threads';
import { resolve, isAbsolute } from 'path';
import { JobResult, Message } from '../types';

/**
 * Worker Thread para execução de grafos
 * 
 * Este worker:
 * 1. Carrega o GraphEngine do caminho fornecido
 * 2. Escuta mensagens do parent
 * 3. Executa o grafo usando graphEngine.execute()
 * 4. Retorna resultado via parentPort
 */

interface WorkerTask {
  jobId: string;
  messages: Message[];
}

const EXECUTION_TIMEOUT = 300000; // 5 minutes

// Allowed base directory for graph paths (security measure)
const ALLOWED_GRAPH_DIR = process.env.GRAPH_DIR || process.cwd();

/**
 * Validates that the graph path is within allowed directory and has valid extension.
 * Prevents path traversal attacks and ensures only .js/.ts files can be loaded.
 */
function validateGraphPath(graphPath: string): string {
  // Resolve to absolute path
  const resolvedPath = isAbsolute(graphPath) 
    ? graphPath 
    : resolve(ALLOWED_GRAPH_DIR, graphPath);
  
  // Ensure path is within allowed directory (prevent traversal)
  const allowedDir = resolve(ALLOWED_GRAPH_DIR);
  if (!resolvedPath.startsWith(allowedDir)) {
    throw new Error('Invalid graph path: path traversal detected');
  }
  
  // Ensure file has .js or .ts extension
  if (!/\.(js|ts)$/.test(resolvedPath)) {
    throw new Error('Invalid graph path: must be .js or .ts file');
  }
  
  return resolvedPath;
}

// Carregar o grafo do usuário
let graphEngine: any;

try {
  const validatedPath = validateGraphPath(workerData.graphPath);
  const graphModule = require(validatedPath);
  graphEngine = graphModule.default || graphModule.graph || graphModule.createGraph?.();
  
  if (!graphEngine || typeof graphEngine.execute !== 'function') {
    throw new Error(
      'Invalid GraphEngine: export must be default, "graph", or createGraph() function'
    );
  }
  
  console.log(`[Worker] GraphEngine loaded from ${validatedPath}`);
} catch (error) {
  // Sanitize error message - don't expose full path
  console.error('[Worker] Failed to load GraphEngine:', 
    error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

if (parentPort) {
  parentPort.on('message', async (task: WorkerTask) => {
    const startTime = Date.now();
    
    console.log(`[Worker] Starting job ${task.jobId}`);
    
    const timeoutId = setTimeout(() => {
      console.error(`[Worker] Job ${task.jobId} timed out after ${EXECUTION_TIMEOUT}ms`);
      parentPort?.postMessage({
        jobId: task.jobId,
        result: {
          content: null,
          messages: task.messages,
          success: false,
          error: 'Job execution timeout',
          metadata: { executionTime: EXECUTION_TIMEOUT, startTime: new Date(startTime), endTime: new Date() }
        }
      });
      process.exit(1); // Force exit on timeout
    }, EXECUTION_TIMEOUT);
    
    try {
      // Executa o grafo usando a API do SDK
      const result = await graphEngine.execute({
        messages: task.messages,
        data: {},
        metadata: {}
      });
      
      clearTimeout(timeoutId);
      
      const executionTime = Date.now() - startTime;
      
      const jobResult: JobResult = {
        content: result.state.messages[result.state.messages.length - 1]?.content || null,
        messages: result.state.messages,
        success: result.status === 'FINISHED' || result.status === 'COMPLETED',
        error: result.status === 'ERROR' ? 'Graph execution failed' : undefined,
        metadata: {
          executionTime,
          startTime: new Date(startTime),
          endTime: new Date(),
          graphStatus: result.status
        }
      };

      console.log(`[Worker] Job ${task.jobId} completed in ${executionTime}ms`);

      parentPort?.postMessage({
        jobId: task.jobId,
        result: jobResult
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      const executionTime = Date.now() - startTime;
      
      console.error(`[Worker] Job ${task.jobId} failed:`, error);
      
      const jobResult: JobResult = {
        content: null,
        messages: task.messages,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime,
          startTime: new Date(startTime),
          endTime: new Date()
        }
      };

      parentPort?.postMessage({
        jobId: task.jobId,
        result: jobResult
      });
    }
  });
  
  console.log('[Worker] Ready and waiting for tasks');
}
