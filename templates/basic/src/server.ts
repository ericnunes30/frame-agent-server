import { serveGraph } from '@ericnunes/frame-agent-server';
import { config } from './config';
import { graph } from './graph';

async function main() {
  try {
    await serveGraph(graph, {
      port: config.port,
      host: config.host,
      workers: config.workers
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
