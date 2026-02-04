import { spawn, spawnSync } from 'child_process';
import { createLogger } from '../utils/logger';

const logger = createLogger('dev');

interface DevOptions {
  port: string;
  workers: string;
}

function checkCommand(cmd: string): void {
  // Use npx to check for command availability (works for local packages too)
  const result = spawnSync('npx', ['--version', '--package', cmd], { stdio: 'ignore' });
  if (result.status !== 0) {
    logger.error(`${cmd} is not installed`);
    logger.info(`Please run: npm install -D ${cmd}`);
    process.exit(1);
  }
}

export function devCommand(options: DevOptions): void {
  // Validate port
  const port = parseInt(options.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.error('Invalid port number. Must be between 1 and 65535');
    process.exit(1);
  }

  // Validate workers
  const workers = parseInt(options.workers, 10);
  if (isNaN(workers) || workers < 1 || workers > 100) {
    logger.error('Invalid workers number. Must be between 1 and 100');
    process.exit(1);
  }

  // Check if required tools exist
  checkCommand('tsx');

  logger.info('Starting development server...');
  logger.info(`Port: ${options.port}`);
  logger.info(`Workers: ${options.workers}`);

  const env = {
    ...process.env,
    PORT: options.port,
    WORKERS: options.workers,
    NODE_ENV: 'development'
  };

  const child = spawn('tsx', ['watch', 'src/index.ts'], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32'
  });

  // Signal handling for graceful shutdown
  const cleanup = () => {
    logger.info('Shutting down development server...');
    child.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}
