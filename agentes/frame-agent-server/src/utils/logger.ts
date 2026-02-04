import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Cria um logger estruturado com pino
 */
export function createLogger(name: string) {
  return pino({
    name,
    level: LOG_LEVEL,
    transport: process.env.NODE_ENV === 'development' 
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      : undefined,
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV || 'production'
    }
  });
}

export const logger = createLogger('frame-agent-server');
