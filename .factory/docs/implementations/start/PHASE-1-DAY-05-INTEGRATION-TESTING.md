# Fase 1 - Day 5: Integration & Testing

**Fase:** 1 - Core Library  
**Dia:** 5  
**Status:** Pronto para implementação  
**Tempo estimado:** 6-8 horas

---

## Objetivo

Finalizar testes de integração, garantir cobertura de código, documentar a API e preparar o pacote para publicação.

---

## Tarefas

### 5.1 Testes de Integração Completos
- [ ] Testar fluxo completo: submit → execução → resultado
- [ ] Testar concorrência com múltiplos jobs
- [ ] Testar fila cheia e rate limiting
- [ ] Testar shutdown graceful

### 5.2 Testes de Carga (Opcional)
- [ ] Criar script de carga simples
- [ ] Testar com 100+ requisições simultâneas
- [ ] Verificar estabilidade do worker pool

### 5.3 Cobertura de Código
- [ ] Atingir 80%+ coverage
- [ ] Cobrir casos de erro
- [ ] Cobrir edge cases

### 5.4 Documentação
- [ ] Criar README.md
- [ ] Documentar API endpoints
- [ ] Criar exemplos de uso

### 5.5 Preparação para Publicação
- [ ] Verificar package.json
- [ ] Criar CHANGELOG.md
- [ ] Preparar para npm publish

---

## Arquivos a Criar

### README.md
```markdown
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
```

### CHANGELOG.md
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-03

### Added
- Initial release of `@ericnunes/frame-agent-server`
- Fastify HTTP server with CORS and rate limiting
- Worker Threads support for concurrent execution
- In-memory job queue with TTL and cleanup
- Health check endpoints (`/health`, `/ready`, `/live`)
- Graceful shutdown support
- TypeScript support with strict mode
- Comprehensive test suite

### Features
- `serveGraph()` function to start server with GraphEngine
- `POST /execute` endpoint for job submission
- `GET /jobs/:id` endpoint for job status
- Job queue with configurable size limits
- Automatic cleanup of completed jobs
- Structured logging with pino

[1.0.0]: https://github.com/ericnunes/frame-agent-server/releases/tag/v1.0.0
```

### tests/integration/full-flow.test.ts
```typescript
import { serveGraph } from '../../src/server';
import { FastifyInstance } from 'fastify';
import { resolve } from 'path';

describe('Full Flow Integration', () => {
  let server: FastifyInstance;

  // Mock GraphEngine que simula delay
  const createMockGraphEngine = (delayMs: number = 100) => ({
    execute: async ({ messages }: { messages: any[] }) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      return {
        state: { 
          messages: [
            ...messages, 
            { role: 'assistant', content: `Response to: ${messages[messages.length - 1]?.content}` }
          ],
          data: {},
          metadata: {}
        },
        status: 'FINISHED'
      };
    }
  });

  beforeAll(async () => {
    const mockGraph = createMockGraphEngine(200);
    server = await serveGraph(mockGraph, { 
      port: 0,
      workers: 2,
      jobTTL: 60000,
      maxQueueSize: 10
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should complete full flow: submit → poll → result', async () => {
    // 1. Submit job
    const submitResponse = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        messages: [{ role: 'user', content: 'Hello' }]
      }
    });

    expect(submitResponse.statusCode).toBe(200);
    const { jobId } = JSON.parse(submitResponse.body);

    // 2. Poll for completion (max 10 attempts)
    let result;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const statusResponse = await server.inject({
        method: 'GET',
        url: `/jobs/${jobId}`
      });

      result = JSON.parse(statusResponse.body);
      
      if (result.status === 'completed' || result.status === 'failed') {
        break;
      }
    }

    // 3. Verify result
    expect(result.status).toBe('completed');
    expect(result.result.success).toBe(true);
    expect(result.result.content).toContain('Response to: Hello');
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('should handle multiple concurrent jobs', async () => {
    // Submit 5 jobs
    const jobPromises = Array.from({ length: 5 }, (_, i) => 
      server.inject({
        method: 'POST',
        url: '/execute',
        payload: {
          messages: [{ role: 'user', content: `Job ${i}` }]
        }
      })
    );

    const responses = await Promise.all(jobPromises);
    
    // All should be accepted
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });

    const jobIds = responses.map(r => JSON.parse(r.body).jobId);

    // Poll until all complete
    const pollJob = async (jobId: string) => {
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const response = await server.inject({
          method: 'GET',
          url: `/jobs/${jobId}`
        });

        const result = JSON.parse(response.body);
        
        if (result.status === 'completed' || result.status === 'failed') {
          return result;
        }
      }
      throw new Error(`Job ${jobId} did not complete in time`);
    };

    const results = await Promise.all(jobIds.map(pollJob));
    
    // All should complete successfully
    results.forEach((result, i) => {
      expect(result.status).toBe('completed');
      expect(result.result.success).toBe(true);
      expect(result.result.content).toContain(`Job ${i}`);
    });
  });

  it('should return queue position for queued jobs', async () => {
    // Submit more jobs than workers to force queuing
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => 
        server.inject({
          method: 'POST',
          url: '/execute',
          payload: {
            messages: [{ role: 'user', content: 'Test' }]
          }
        })
      )
    );

    const positions = responses.map(r => JSON.parse(r.body).position);
    
    // Positions should be 0, 1, 2, 3, 4 (or some running immediately)
    positions.forEach((pos, i) => {
      expect(typeof pos).toBe('number');
      expect(pos).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### tests/integration/error-cases.test.ts
```typescript
import { serveGraph } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Error Cases Integration', () => {
  let server: FastifyInstance;

  const createMockGraphEngine = () => ({
    execute: async ({ messages }: { messages: any[] }) => ({
      state: { 
        messages: [...messages, { role: 'assistant', content: 'Mock' }],
        data: {},
        metadata: {}
      },
      status: 'FINISHED'
    })
  });

  beforeAll(async () => {
    const mockGraph = createMockGraphEngine();
    server = await serveGraph(mockGraph, { 
      port: 0,
      workers: 1,
      jobTTL: 60000,
      maxQueueSize: 2 // Small queue for testing
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 400 for missing messages', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for empty messages array', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: { messages: [] }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for invalid message format', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        messages: [{ role: 'user' }] // missing content
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for invalid role', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/execute',
      payload: {
        messages: [{ role: 'bot', content: 'Hello' }]
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 for non-existent job', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/jobs/invalid-id-format'
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 429 when queue is full', async () => {
    // Fill the queue
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        server.inject({
          method: 'POST',
          url: '/execute',
          payload: {
            messages: [{ role: 'user', content: `Fill ${i}` }]
          }
        }).catch(() => null)
      );
    }

    const responses = await Promise.all(promises);
    
    // At least one should be 429
    const has429 = responses.some(r => r?.statusCode === 429);
    expect(has429).toBe(true);
  });

  it('should return 404 for unknown routes', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/unknown'
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Not found');
  });
});
```

### scripts/load-test.js
```javascript
/**
 * Simple load test script
 * 
 * Usage: node scripts/load-test.js [concurrency] [requests]
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.argv[2], 10) || 10;
const TOTAL_REQUESTS = parseInt(process.argv[3], 10) || 100;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runLoadTest() {
  console.log(`Load Test: ${CONCURRENCY} concurrent, ${TOTAL_REQUESTS} total`);
  console.log(`Target: ${BASE_URL}\n`);

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;

  async function worker() {
    while (completed + failed < TOTAL_REQUESTS) {
      try {
        const response = await makeRequest('/execute', 'POST', {
          messages: [{ role: 'user', content: `Load test ${Date.now()}` }]
        });

        if (response.status === 200) {
          completed++;
          process.stdout.write('.');
        } else {
          failed++;
          process.stdout.write('X');
        }
      } catch (error) {
        failed++;
        process.stdout.write('E');
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const duration = Date.now() - startTime;
  const rps = (completed / (duration / 1000)).toFixed(2);

  console.log('\n');
  console.log('Results:');
  console.log(`  Completed: ${completed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  RPS: ${rps}`);

  // Health check
  const health = await makeRequest('/health');
  console.log('\nHealth:');
  console.log(`  Status: ${health.body.status}`);
  console.log(`  Workers: ${health.body.stats.workers}`);
  console.log(`  Available: ${health.body.stats.availableWorkers}`);
  console.log(`  Queue: ${health.body.stats.queued}`);
  console.log(`  Running: ${health.body.stats.running}`);
}

runLoadTest().catch(console.error);
```

---

## Checklist de Conclusão da Fase 1

### Testes
- [ ] Todos os testes unitários passando
- [ ] Todos os testes de integração passando
- [ ] Cobertura de código >= 80%
- [ ] Testes de carga executados (opcional)

### Documentação
- [ ] README.md completo
- [ ] CHANGELOG.md criado
- [ ] Exemplos de uso incluídos
- [ ] API documentada

### Código
- [ ] TypeScript strict mode sem erros
- [ ] Lint passando
- [ ] Todos os arquivos criados
- [ ] Exports corretos

### Preparação
- [ ] package.json verificado
- [ ] .gitignore configurado
- [ ] Scripts de build funcionando
- [ ] Scripts de teste funcionando

---

## Comandos Finais

```bash
# Verificar build
npm run build

# Executar todos os testes
npm test

# Verificar cobertura
npm run test:coverage

# Verificar TypeScript
npm run lint

# Preparar para publicação (dry-run)
npm publish --dry-run
```

---

## Próximo Passo

Após completar a Fase 1, prossiga para: **Fase 2: CLI & Boilerplate**
