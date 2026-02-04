/**
 * __PROJECT_NAME__ - Main Entry Point
 * 
 * Entry point for the agent server
 */

import { serveGraph } from '@ericnunes/frame-agent-server';
import { graph } from './graph';

async function main(): Promise<void> {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  console.log(`Starting __PROJECT_NAME__ server...`);
  console.log(`Graph: ${graph.name}`);
  console.log(`Server: http://${host}:${port}`);

  await serveGraph(graph, {
    port,
    host,
    workers: parseInt(process.env.WORKERS || '4', 10)
  });

  console.log('Server is ready!');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
