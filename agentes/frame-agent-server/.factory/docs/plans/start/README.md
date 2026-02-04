# @ericnunes/frame-agent-server

HTTP server for [frame-agent-sdk](https://github.com/ericnunes30/frame-agent-sdk) agents with Worker Threads concurrency.

[![npm version](https://badge.fury.io/js/@ericnunes%2Fframe-agent-server.svg)](https://www.npmjs.com/package/@ericnunes/frame-agent-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- 🚀 **High Performance**: Worker Threads for true parallelism
- 📦 **Zero Config**: Works out of the box with sensible defaults
- 🔧 **TypeScript First**: Full type safety and IntelliSense
- 🐳 **Docker Ready**: Optimized for Docker Swarm deployments
- 📊 **Observable**: Optional HyperDX integration
- 🔄 **Async by Design**: Non-blocking API with job polling

---

## Installation

```bash
npm install @ericnunes/frame-agent-sdk @ericnunes/frame-agent-server
```

---

## Quick Start

### 1. Create an Agent

```typescript
// src/agent.ts
import { createAgent } from '@ericnunes/frame-agent-sdk';
import { serveAgent } from '@ericnunes/frame-agent-server';

const agent = createAgent({
  name: 'My Assistant',
  role: 'Helper',
  goal: 'Help users with their questions',
  backstory: 'An AI assistant designed to be helpful',
  llmConfig: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7
  }
});

serveAgent(agent, {
  port: 3000,
  workers: 4  // Number of Worker Threads (default: 4)
});
```

### 2. Run the Server

```bash
# Development
npx tsx src/agent.ts

# Production
npm run build
node dist/agent.js
```

### 3. Use the API

```bash
# Submit a job
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'

# Response: {"jobId": "abc-123", "status": "queued"}

# Poll for result
curl http://localhost:3000/jobs/abc-123

# Response: {"jobId": "abc-123", "status": "completed", "result": {...}}
```

---

## API Reference

### `serveAgent(agent, options)`

Starts the HTTP server with the given agent.

```typescript
import { serveAgent } from '@ericnunes/frame-agent-server';

serveAgent(agent, {
  port?: number;      // Server port (default: 3000)
  workers?: number;   // Worker Threads count (default: 4)
  jobTTL?: number;    // Job result TTL in ms (default: 1 hour)
  hyperdx?: {         // Optional HyperDX config
    apiKey?: string;
    endpoint?: string;
  }
});
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/execute` | Submit a job to the agent |
| `GET` | `/jobs/:id` | Get job status and result |
| `GET` | `/health` | Health check |

### POST /execute

Submit a message to the agent for processing.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "position": 0
}
```

### GET /jobs/:id

Get the status and result of a job.

**Response (queued):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "createdAt": "2026-02-03T10:30:00Z"
}
```

**Response (completed):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": {
    "content": "Hello! How can I help you today?",
    "messages": [...]
  },
  "completedAt": "2026-02-03T10:30:05Z",
  "durationMs": 5234
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Fastify HTTP Server                       │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐      │
│  │ POST /exec  │  │ GET /jobs   │  │ GET /health    │      │
│  └──────┬──────┘  └─────────────┘  └────────────────┘      │
│         │                                                   │
│  ┌──────┴──────────────────────────────────────────┐       │
│  │           Job Queue (In-Memory)                  │       │
│  └──────────────────────┬───────────────────────────┘       │
│                         │ Dispatcher                        │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│              Worker Threads Pool (configurable)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Worker 1 │ │ Worker 2 │ │ Worker 3 │ │ Worker 4 │       │
│  │ (Agent)  │ │ (Agent)  │ │ (Agent)  │ │ (Agent)  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

- **Main Thread**: Fastify HTTP server, receives requests
- **Job Queue**: In-memory queue with configurable concurrency
- **Worker Threads**: Each worker runs an isolated agent instance
- **No Streaming**: Async execution with polling

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

ENV PORT=3000
ENV WORKERS=4

EXPOSE 3000

CMD ["node", "dist/agent.js"]
```

### Docker Compose (Swarm)

```yaml
version: '3.8'

services:
  agent:
    build: .
    environment:
      - PORT=3000
      - WORKERS=4
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    deploy:
      replicas: 2
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.agent.rule=Host(`agent.example.com`)"
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `WORKERS` | `4` | Number of Worker Threads |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `CORS_ORIGIN` | `*` | CORS origin |
| `HYPERDX_API_KEY` | - | Optional HyperDX API key |

---

## Roadmap

### Phase 1: Core (Now) ✅
- [x] HTTP server with Fastify
- [x] Worker Threads concurrency
- [x] In-memory job queue
- [x] TypeScript support

### Phase 2: CLI (Future)
- [ ] Global CLI: `frame-agent-server`
- [ ] GitHub template
- [ ] Docker optimization

### Phase 3: Production
- [ ] Redis persistence
- [ ] Metrics (Prometheus)
- [ ] Rate limiting
- [ ] Authentication

---

## License

MIT © [Eric Nunes](https://github.com/ericnunes30)

---

## Related

- [frame-agent-sdk](https://github.com/ericnunes30/frame-agent-sdk) - Agent construction SDK
