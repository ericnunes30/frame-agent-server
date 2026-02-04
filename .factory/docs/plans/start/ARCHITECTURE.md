# Frame-Agent-Server Architecture Design

**Date:** 2026-02-03  
**Status:** Final  
**Author:** Senior Architect Droid  

---

## Executive Summary

This document outlines the final architecture for `@ericnunes/frame-agent-server`, an **npm package** that provides a lightweight HTTP server to **expose GraphEngine instances** created with `@ericnunes/frame-agent-sdk`. The server **does not create or configure graphs** - it only exposes them via HTTP.

> **Important:** The server is **pure infrastructure** (HTTP + Workers + Queue). The SDK is used to define graphs in templates/boilerplates. The server simply exposes `graphEngine.execute()` via HTTP.

### Package Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              @ericnunes/frame-agent-server                   │
│                     (npm package)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Biblioteca: import { serveGraph } from '@ericnunes/...'    │
│  CLI: npx @ericnunes/frame-agent-server (futuro)            │
│                                                              │
│  Dependência: @ericnunes/frame-agent-sdk (peer)             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Decisions (Final)

- **Package:** Published to npm as `@ericnunes/frame-agent-server`
- **SDK Dependency:** Uses `@ericnunes/frame-agent-sdk` as peer dependency
- **Model:** One graph per server instance (isolated, simple)
- **Interface:** Library (now) + CLI (future)
- **Concurrency:** Worker Threads with configurable pool (default: 4)
- **Queue:** In-memory (no Redis/RabbitMQ for MVP)
- **Execution:** Asynchronous with polling (no streaming)

---

## NPM Package Structure

### Package.json

```json
{
  "name": "@ericnunes/frame-agent-server",
  "version": "1.0.0",
  "description": "HTTP server for frame-agent-sdk agents",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "frame-agent-server": "dist/bin/cli.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "@ericnunes/frame-agent-sdk": "^1.0.0"
  },
  "dependencies": {
    "fastify": "^4.x",
    "@fastify/cors": "^8.x",
    "pino": "^8.x",
    "cac": "^6.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "typescript": "^5.x",
    "tsx": "^4.x",
    "jest": "^29.x"
  }
}
```

### Relationship with SDK

```
┌─────────────────────────────────────────────────────────────┐
│                    Template/Boilerplate (Usuário)            │
│                                                              │
│  npm install @ericnunes/frame-agent-sdk                     │
│  npm install @ericnunes/frame-agent-server                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/graph.ts                                       │   │
│  │                                                     │   │
│  │  import { GraphEngine, createAgentNode } from       │   │
│  │    '@ericnunes/frame-agent-sdk'                    │   │
│  │                                                     │   │
│  │  export function createGraph() {                    │   │
│  │    return new GraphEngine({                         │   │
│  │      nodes: { agent: createAgentNode({...}) },     │   │
│  │      edges: { agent: 'END' },                      │   │
│  │      entryPoint: 'agent'                           │   │
│  │    });                                              │   │
│  │  }                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/index.ts                                       │   │
│  │                                                     │   │
│  │  import { serveGraph } from '@ericnunes/...'       │   │
│  │  import { createGraph } from './graph'             │   │
│  │                                                     │   │
│  │  const graph = createGraph();  // Usuário define   │   │
│  │  serveGraph(graph, { workers: 4 }); // Server ex-  │   │
│  │  póe                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Installation

```bash
# Usuário instala SDK + Server
npm install @ericnunes/frame-agent-sdk @ericnunes/frame-agent-server
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Swarm + Traefik                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Agente A   │  │  Agente B   │  │  Agente C   │             │
│  │  :3000      │  │  :3000      │  │  :3000      │             │
│  │  (Container)│  │  (Container)│  │  (Container)│             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └─────────────────┼─────────────────┘                   │
│                           ▼                                     │
│              ┌─────────────────────┐                           │
│              │  Traefik LB/Router  │                           │
│              │  agente-a.local     │                           │
│              │  agente-b.local     │                           │
│              └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Single Container (One Graph)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Fastify HTTP Server                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐   │   │
│  │  │ POST /exec  │  │ GET /jobs   │  │ GET /health    │   │   │
│  │  └──────┬──────┘  └─────────────┘  └────────────────┘   │   │
│  │         │                                                │   │
│  │  ┌──────┴──────────────────────────────────────────┐    │   │
│  │  │           Job Queue (In-Memory)                  │    │   │
│  │  │  [job1, job2, job3, ...]                         │    │   │
│  │  │  Max concurrent: 4 (configurable)                │    │   │
│  │  └──────────────────────┬───────────────────────────┘    │   │
│  │                         │ Dispatcher                     │   │
│  └─────────────────────────┼────────────────────────────────┘   │
│                            │                                     │
│  ┌─────────────────────────┼─────────────────────────────────┐  │
│  │              Worker Threads Pool (4 workers)               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │  │
│  │  │ Worker 1 │ │ Worker 2 │ │ Worker 3 │ │ Worker 4 │      │  │
│  │  │ GraphEng │ │ GraphEng │ │ GraphEng │ │ GraphEng │      │  │
│  │  │ execute()│ │ execute()│ │ execute()│ │ execute()│      │  │
│  │  │ Síncrono │ │ Síncrono │ │ Síncrono │ │ Síncrono │      │  │
│  │  │ Isolado  │ │ Isolado  │ │ Isolado  │ │ Isolado  │      │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ⚠️  O server NÃO sabe o que está dentro do grafo               │
│  ⚠️  O server apenas executa graphEngine.execute()              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### 1. HTTP Framework: **Fastify**

| Framework | Performance | Ecosystem | Verdict |
|-----------|-------------|-----------|---------|
| **Fastify** | ⭐⭐⭐⭐⭐ | Rich plugins | ✅ Recommended |
| Express | ⭐⭐⭐ | Mature | ❌ Slower |
| NestJS | ⭐⭐⭐ | Opinionated | ⚠️ Overkill for MVP |

**Rationale:**
- 2x faster than Express
- TypeScript-first
- Built-in JSON schema validation
- Low overhead

### 2. Concurrency: **Worker Threads**

| Approach | Isolation | Complexity | Verdict |
|----------|-----------|------------|---------|
| **Worker Threads** | Process-level | Medium | ✅ Recommended |
| Main Thread Async | None | Low | ❌ Blocks event loop |
| Child Processes | High | High | ⚠️ Too heavy |

**Rationale:**
- True parallelism (uses multiple CPU cores)
- Isolamento de falhas (crash em um worker não derruba servidor)
- Controle de concorrência (pool limitado)
- Nativo do Node.js (sem dependências)

### 3. Queue: **In-Memory**

| Approach | Persistência | Dependências | Verdict |
|----------|--------------|--------------|---------|
| **In-Memory** | ❌ Perde no restart | Zero | ✅ MVP |
| Redis/BullMQ | ✅ Persiste | Redis | ⚠️ Futuro |

**Rationale:**
- Zero configuração para MVP
- Upgrade path claro para Redis futuro
- Trade-off aceitável (perda de jobs em restart)

### 4. Execution Model: **Asynchronous with Polling**

```
Client → POST /execute (mensagem)
              ↓
Server ← { jobId: "abc-123", status: "queued" }
              ↓
Client → GET /jobs/abc-123 (polling...)
              ↓
Server ← { status: "completed", result: {...} }
```

**Rationale:**
- Não bloqueia cliente
- SDK é síncrono, mas servidor é async
- Sem complexidade de WebSocket/SSE
- HyperDX cobre observabilidade

---

## API Design

### Endpoints

```
POST /execute          → Inicia execução, retorna jobId
GET  /jobs/:id         → Consulta status/resultado do job
GET  /health           → Health check do servidor
```

### Request/Response Examples

**POST /execute**
```json
// Request
{
  "messages": [
    { "role": "user", "content": "Olá, como vai?" }
  ]
}

// Response (imediato)
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "position": 2
}
```

**GET /jobs/:id**
```json
// Response (enquanto processa)
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "startedAt": "2026-02-03T10:30:00Z"
}

// Response (quando completo)
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": {
    "content": "Olá! Estou bem, obrigado...",
    "messages": [...]
  },
  "completedAt": "2026-02-03T10:30:05Z",
  "durationMs": 5234
}
```

---

## Componentes

### 1. Job Queue (In-Memory)

```typescript
interface Job {
  id: string;
  messages: Message[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ExecutionResult;
  error?: string;
}

class JobQueue {
  private jobs = new Map<string, Job>();
  private queue: string[] = []; // IDs dos jobs pendentes
  private maxConcurrent: number;
  private running = new Set<string>();
  
  // Quando worker termina, pega próximo da fila
  // TTL automático para jobs completos (evita memory leak)
}
```

### 2. Worker Pool

```typescript
import { GraphEngine } from '@ericnunes/frame-agent-sdk';

class WorkerPool {
  private workers: Worker[] = [];
  private maxWorkers: number;
  private graphEngine: GraphEngine;  // ✅ Instância do grafo do usuário
  
  constructor(graphEngine: GraphEngine, maxWorkers: number) {
    this.graphEngine = graphEngine;
    this.maxWorkers = maxWorkers;
    // ✅ O worker executa graphEngine.execute() - não sabe o que tem dentro
  }
  
  execute(job: Job): Promise<ExecutionResult> {
    // ✅ O server apenas sabe que o grafo tem execute()
    const result = await this.graphEngine.execute({
      messages: job.messages,
      data: {},
      metadata: {}
    });
    return result;
  }
}
```

### 3. Job Results Store

```typescript
class JobResultsStore {
  private results = new Map<string, Job>();
  private ttlMs: number; // Tempo de vida dos resultados
  
  // Salva resultado
  // Consulta por ID
  // Cleanup automático de jobs antigos
}
```

---

## Fluxo de Execução

```
1. Cliente envia POST /execute
   ↓
2. Server cria Job com ID único
   Adiciona na fila (in-memory)
   Retorna imediatamente: { jobId, status: "queued" }
   ↓
3. Dispatcher verifica workers disponíveis
   Se houver worker livre → atribui job
   Se todos ocupados → job aguarda na fila
   ↓
4. Worker executa agente (SDK síncrono)
   Isolado na thread, não afeta main thread
   ↓
5. Quando worker termina:
   - Salva resultado no JobResultsStore
   - Notifica dispatcher (worker livre)
   - Dispatcher pega próximo job da fila (se houver)
   ↓
6. Cliente consulta GET /jobs/:id (polling)
   Recebe status até "completed" ou "failed"
```

---

## Interface Pública

### Como Biblioteca (Fase 1 - Agora)

```typescript
// src/index.ts (do template/boilerplate do usuário)
import { GraphEngine, createAgentNode } from '@ericnunes/frame-agent-sdk';
import { serveGraph } from '@ericnunes/frame-agent-server';

// ✅ Usuário define o grafo (SDK)
const graph = new GraphEngine({
  nodes: {
    agent: createAgentNode({
      llm: { 
        model: process.env.MODEL || 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY! 
      },
      mode: 'react',
      agentInfo: { 
        name: 'Assistente de Vendas', 
        goal: 'Ajudar usuários',
        backstory: 'Um assistente prestativo'
      }
    })
  },
  edges: { agent: 'END' },
  entryPoint: 'agent'
});

// ✅ Server apenas expõe o grafo
serveGraph(graph, {
  port: 3000,
  workers: 4,
  jobTTL: 3600000
});
```

### Como CLI (Fase 2 - Futuro)

> **Nota:** O CLI será implementado em fase futura. Inicialmente, apenas a biblioteca estará disponível.

```bash
# Instalação global (futuro)
npm install -g @ericnunes/frame-agent-server

# Uso (futuro) - carrega grafo de arquivo
frame-agent-server ./dist/graph.js --workers 4 --port 3000

# Ou com npx (futuro)
npx @ericnunes/frame-agent-server ./dist/graph.js
```

---

## Deployment

### Docker Swarm + Traefik

```yaml
# docker-compose.yml
version: '3.8'

services:
  agente-vendas:
    image: ${DOCKER_REGISTRY}/agente-vendas:${VERSION}
    environment:
      - PORT=3000
      - WORKERS=4
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    deploy:
      replicas: 2
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.agente-vendas.rule=Host(`vendas.seudominio.com`)"
        - "traefik.http.services.agente-vendas.loadbalancer.server.port=3000"
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

### Escalonamento

```bash
# Escala vertical (mais workers)
docker service update --env-add WORKERS=8 agente-vendas

# Escala horizontal (mais réplicas)
docker service scale agente-vendas=5
```

---

## Decisões Críticas

### 1. Um Grafo por Servidor

**Contexto:** Multi-tenant vs Single-tenant

**Decisão:** Um grafo por servidor/container

**Rationale:**
- ✅ Simplicidade máxima
- ✅ Isolamento total
- ✅ Deploy independente por grafo
- ✅ Escalabilidade granular
- ✅ CI/CD simples (um repo por grafo)

**Trade-offs:**
- ❌ Mais containers para gerenciar
- ❌ Overhead de memória por instância

**Mitigação:** Docker Swarm + Traefik gerenciam automaticamente

---

### 2. Worker Threads para Concorrência

**Contexto:** SDK síncrono, mas não queremos bloquear a API

**Decisão:** Worker Threads com pool configurável

**Rationale:**
- ✅ Paralelismo real (múltiplos CPUs)
- ✅ Isolamento de falhas
- ✅ Controle de concorrência (evita sobrecarga)
- ✅ Nativo Node.js

**Trade-offs:**
- ❌ Jobs na fila são perdidos em restart
- ❌ Limite vertical (número de CPUs)

**Mitigação:** Fase 2 pode adicionar Redis para persistência

---

### 3. Sem Streaming

**Contexto:** Streaming vs Polling

**Decisão:** Sem streaming (HTTP padrão com polling)

**Rationale:**
- ✅ Simplicidade de implementação
- ✅ Sem estado de conexão
- ✅ Load balancer friendly
- ✅ HyperDX já cobre observabilidade

**Trade-offs:**
- ❌ Latência percebida maior (polling)
- ❌ Menos "real-time"

**Mitigação:** Polling é aceitável para casos de uso async

---

### 4. Agente Definido no Código

**Contexto:** YAML vs Código

**Decisão:** Agente definido no código, sem YAML

**Rationale:**
- ✅ TypeScript = autocomplete e type safety
- ✅ Lógica customizada fácil
- ✅ Versionamento com Git
- ✅ CI/CD natural

**Trade-offs:**
- ❌ Precisa rebuild para mudar config
- ❌ Menos "low-code"

**Mitigação:** Hot-reload opcional no futuro

---

## MVP Scope (Fases)

### Fase 1: Core - Biblioteca NPM (Semana 1)
**Objetivo:** Publicar pacote npm `@ericnunes/frame-agent-server` com API de biblioteca.

- [ ] Estrutura de pacote npm (`package.json`, `tsconfig.json`)
- [ ] Fastify server com 3 endpoints
- [ ] Worker Threads pool (configurável)
- [ ] Fila in-memory simples
- [ ] Integração com `@ericnunes/frame-agent-sdk` (peer dependency)
- [ ] Job results com TTL
- [ ] Health check
- [ ] Logs estruturados (pino)
- [ ] Exportar `serveGraph(graph: GraphEngine, options)`
- [ ] Preparar para publicação npm

### Fase 2: CLI & Template (Semana 2)
**Objetivo:** Adicionar CLI e criar template GitHub.

- [ ] CLI `frame-agent-server` (binário npm)
- [ ] Template GitHub `template-frame-agent`
- [ ] Dockerfile otimizado
- [ ] docker-compose.yml exemplo
- [ ] Documentação de deploy

### Fase 3: Produção (Semana 3)
**Objetivo:** Produção-ready com métricas e testes.

- [ ] Graceful shutdown
- [ ] Métricas básicas (Prometheus)
- [ ] Rate limiting
- [ ] Testes (unit + integration)
- [ ] Documentação completa
- [ ] Publicar versão 1.0.0 no npm

### Fase 4: Melhorias Futuras (Opcional)
- [ ] Redis para persistência de jobs
- [ ] SSE streaming (se necessário)
- [ ] Dashboard web
- [ ] Multi-agent no mesmo servidor

---

## Riscos

### Alto

1. **Perda de jobs em restart**
   - **Mitigação:** TTL curto, cliente deve tratar timeout, Redis futuro

2. **Memory leak na fila**
   - **Mitigação:** TTL automático para jobs completos, limites de fila

### Médio

3. **Worker bloqueado indefinidamente**
   - **Mitigação:** Timeout configurável, health check dos workers

4. **Escalabilidade limitada**
   - **Mitigação:** Documentar limites, Redis para fila distribuída futura

### Baixo

5. **Breaking changes no SDK**
   - **Mitigação:** Pin de versão, testes de integração

---

## Checklist de Implementação

- [ ] Interface `serveGraph(graph: GraphEngine, options)`
- [ ] Classe `JobQueue` (in-memory)
- [ ] Classe `WorkerPool` (Worker Threads, recebe GraphEngine)
- [ ] Classe `JobResultsStore` (com TTL)
- [ ] Rotas Fastify: POST /execute, GET /jobs/:id, GET /health
- [ ] CLI com `commander` ou `cac`
- [ ] Template GitHub com estrutura base
- [ ] Dockerfile multi-stage
- [ ] docker-compose.yml para Swarm
- [ ] Testes unitários (Jest)
- [ ] Testes de integração (supertest)
- [ ] Documentação (README, API docs)

---

## Sumário

Esta arquitetura fornece:

- ✅ **Separação de responsabilidades** - Server é infraestrutura, SDK é lógica
- ✅ **Simplicidade** - Zero dependências externas para MVP
- ✅ **Performance** - Worker Threads para paralelismo
- ✅ **Escalabilidade** - Docker Swarm + múltiplas réplicas
- ✅ **Extensibilidade** - Upgrade path para Redis, streaming, etc.

O server é uma **camada de infraestrutura pura** que expõe grafos via HTTP. O SDK é usado exclusivamente nos templates/boilerplates do usuário para definir grafos.
