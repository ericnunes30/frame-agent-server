import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';

const logger = createLogger('build');

export function buildCommand(): void {
  logger.info('Building project...');

  const child = spawn('tsc', [], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  // Signal handling for graceful shutdown
  const cleanup = () => {
    logger.info('Cancelling build...');
    child.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('close', (code) => {
    if (code === 0) {
      logger.success('Build completed successfully!');
    } else {
      logger.error('Build failed');
    }
    process.exit(code || 0);
  });
}
