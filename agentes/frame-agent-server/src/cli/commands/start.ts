import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';

const logger = createLogger('start');

interface StartOptions {
  port: string;
}

export function startCommand(options: StartOptions): void {
  // Validate port
  const port = parseInt(options.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.error('Invalid port number. Must be between 1 and 65535');
    process.exit(1);
  }

  logger.info('Starting production server...');
  logger.info(`Port: ${options.port}`);

  const env = {
    ...process.env,
    PORT: options.port,
    NODE_ENV: 'production'
  };

  const child = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32'
  });

  // Signal handling for graceful shutdown
  const cleanup = () => {
    logger.info('Shutting down server...');
    child.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}
