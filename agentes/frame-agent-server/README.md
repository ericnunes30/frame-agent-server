# @ericnunes/frame-agent-server

HTTP server for exposing GraphEngine execution graphs from `@ericnunes/frame-agent-sdk`.

## Overview

This package provides a Fastify-based HTTP server that exposes `GraphEngine` instances for remote execution via REST API. It uses Worker Threads for concurrency and supports job queuing with TTL.

**Key Features:**
- 🚀 Fastify HTTP server with CORS and rate limiting
- 🧵 Worker Threads for concurrent graph execution
- 📊 In-memory job queue with TTL and cleanup
- 🔍 Health check endpoints for monitoring
- 🔄 Graceful shutdown support

## Installation

```bash
npm install @ericnunes/frame-agent-server @ericnunes/frame-agent-sdk
```

## Quick Start

```typescript
// graph.ts
import { GraphEngine, createAgentNode } from '@ericnunes/frame-agent-sdk';

export function createGraph() {
  return new GraphEngine({
    nodes: {
      agent: createAgentNode({
        llm: { 
          model: 'gpt-4o-mini',
          apiKey: process.env.OPENAI_API_KEY!
        },
        mode: 'react',
        agentInfo: { 
          name: 'Assistant', 
          goal: 'Help users',
          backstory: 'A helpful assistant'
        }
      })
    },
    edges: { agent: 'END' },
    entryPoint: 'agent'
  });
}

// server.ts
import { serveGraph } from '@ericnunes/frame-agent-server';
import { createGraph } from './graph';

const graph = createGraph();

serveGraph(graph, {
  port: 3000,
  workers: 4,
  jobTTL: 3600000, // 1 hour
  maxQueueSize: 100
});
```

## API Endpoints

### POST /execute
Submit a new job for graph execution.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "metadata": {}
}
```

**Response:**
```json
{
  "jobId": "1704067200000-abc123",
  "status": "queued",
  "position": 0
}
```

### GET /jobs/:id
Get job status and result.

**Response:**
```json
{
  "jobId": "1704067200000-abc123",
  "status": "completed",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "startedAt": "2024-01-01T00:00:01.000Z",
  "completedAt": "2024-01-01T00:00:05.000Z",
  "durationMs": 4000,
  "result": {
    "content": "Hello! How can I help you?",
    "messages": [...],
    "success": true,
    "metadata": {
      "executionTime": 4000,
      "startTime": "2024-01-01T00:00:01.000Z",
      "endTime": "2024-01-01T00:00:05.000Z"
    }
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600000,
  "stats": {
    "queued": 0,
    "running": 2,
    "completed": 10,
    "failed": 0,
    "total": 12,
    "workers": 4,
    "availableWorkers": 2
  }
}
```

### GET /ready
Readiness probe for Kubernetes.

### GET /live
Liveness probe for Kubernetes.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `WORKERS` | `4` | Number of worker threads |
| `MAX_QUEUE_SIZE` | `100` | Maximum queue size |
| `JOB_TTL` | `3600000` | Job TTL in milliseconds |
| `CORS_ORIGIN` | `*` | CORS origin |
| `RATE_LIMIT_MAX` | `1000` | Rate limit max requests |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit window in ms |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |

### Options

```typescript
interface ServeGraphOptions {
  port?: number;
  workers?: number;
  jobTTL?: number;
  maxQueueSize?: number;
  requestTimeout?: number;
  shutdownTimeout?: number;
  cors?: {
    origin?: string | string[];
  };
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client Application                                         │
│  POST /execute → Job ID                                     │
│  GET /jobs/:id → Result                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  @ericnunes/frame-agent-server                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Fastify   │  │  JobManager │  │    WorkerPool       │ │
│  │   Server    │←→│   (Queue)   │←→│  (Worker Threads)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              graph.worker.ts (Worker Thread)         │  │
│  │  const result = await graphEngine.execute(...)      │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  @ericnunes/frame-agent-sdk                                 │
│  GraphEngine.execute() → Graph Execution                    │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT
