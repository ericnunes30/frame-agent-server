# Frame-Agent-Server: Decisões Arquiteturais

**Data:** 2026-02-03  
**Status:** Finalizado  

---

## Resumo Executivo

O `@ericnunes/frame-agent-server` será um **pacote npm** que fornece um servidor HTTP leve para **expor grafos de execução (`GraphEngine`)** criados com `@ericnunes/frame-agent-sdk`, utilizando **Worker Threads** para paralelismo e **fila in-memory** para controle de concorrência.

> **Importante:** O servidor **não cria nem configura grafos**. Ele apenas recebe um `GraphEngine` já configurado e o disponibiliza via HTTP.

---

## Arquitetura de Pacotes

```
┌─────────────────────────────────────────────────────────────┐
│  @ericnunes/frame-agent-sdk    (já existe)                  │
│  └── Cria e orquestra grafos (GraphEngine)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓ peer dependency
┌─────────────────────────────────────────────────────────────┐
│  @ericnunes/frame-agent-server   (novo pacote npm)          │
│  └── Expõe grafos via HTTP (Worker Threads)                 │
│  └── Biblioteca (agora) + CLI (futuro)                      │
│  └── ⚠️ NÃO cria grafos - apenas expõe                      │
└─────────────────────────────────────────────────────────────┘
```

### Instalação

```bash
npm install @ericnunes/frame-agent-sdk @ericnunes/frame-agent-server
```

---

## Decisões Principais

### 1. Modelo: Um Grafo por Servidor ✅

**Decisão:** Cada servidor roda apenas um grafo (`GraphEngine`).

**Motivação:**
- Simplicidade máxima
- Isolamento total
- Deploy independente por grafo
- CI/CD simples (um repo por grafo)
- Escalabilidade granular via Docker Swarm

**Deploy:**
```
Grafo A → Container A → Traefik (grafo-a.local)
Grafo B → Container B → Traefik (grafo-b.local)
```

---

### 2. Interface: Biblioteca (Agora) + CLI (Futuro) ✅

**Como Biblioteca (Fase 1):**
```typescript
import { GraphEngine } from '@ericnunes/frame-agent-sdk';
import { serveGraph } from '@ericnunes/frame-agent-server';

// Usuário define o grafo
const graph = new GraphEngine({ nodes, edges, entryPoint });

// Server apenas expõe
serveGraph(graph, { workers: 4 });
```

**Como CLI (Fase 2 - Futuro):**
```bash
frame-agent-server ./dist/graph.js --workers 4 --port 3000
```

**Motivação:**
- Fase 1: Biblioteca permite uso imediato
- Fase 2: CLI adiciona conveniência para não-desenvolvedores
- TypeScript = type safety
- Fácil integração em projetos existentes

---

### 3. Concorrência: Worker Threads ✅

**Decisão:** Pool de Worker Threads (padrão: 4 workers).

**Arquitetura:**
```
Main Thread (Fastify) → Fila In-Memory → Worker Threads (4x)
                              ↓
                    Cada worker executa graphEngine.execute()
                    ⚠️ NÃO sabe o que está dentro do grafo
```

**Motivação:**
- Paralelismo real (múltiplos CPUs)
- Isolamento de falhas
- Controle de concorrência (evita sobrecarga)
- Nativo Node.js (sem dependências)

**Limitação:** Jobs na fila são perdidos em restart (aceitável para MVP).

---

### 4. Execução: Assíncrona com Polling ✅

**Fluxo:**
```
1. POST /execute → Retorna jobId imediatamente
2. GET /jobs/:id → Cliente consulta até completar
```

**Motivação:**
- SDK é síncrono, mas servidor não bloqueia
- Sem complexidade de WebSocket/SSE
- Load balancer friendly
- HyperDX cobre observabilidade

**Endpoints:**
- `POST /execute` - Submite job
- `GET /jobs/:id` - Consulta status/resultado
- `GET /health` - Health check

---

### 5. Fila: In-Memory (MVP) ✅

**Decisão:** Fila simples em memória, sem Redis/RabbitMQ.

**Motivação:**
- Zero configuração para MVP
- Sem dependências externas
- Upgrade path claro para Redis futuro

**Trade-off:** Jobs perdidos em restart (aceitável).

---

### 6. Sem Streaming ✅

**Decisão:** Sem WebSocket ou SSE.

**Motivação:**
- Simplicidade
- Sem estado de conexão
- Polling é suficiente para casos async
- HyperDX opcional para observabilidade

---

### 7. Agente Definido no Código ✅

**Decisão:** Sem YAML, agente definido em TypeScript.

**Motivação:**
- Type safety
- Lógica customizada fácil
- Versionamento com Git
- CI/CD natural

---

## Tecnologias

| Componente | Tecnologia | Motivo |
|------------|------------|--------|
| HTTP Framework | Fastify | Performance, TypeScript-first |
| Concorrência | Worker Threads | Paralelismo nativo, isolamento |
| Fila | In-Memory | Zero deps, MVP simples |
| Logger | Pino | Performance, estruturado |
| CLI | cac | Leve, TypeScript-friendly |

---

## Fases de Implementação

### Fase 1: Core - Publicar Biblioteca NPM (Semana 1)
**Objetivo:** Pacote `@ericnunes/frame-agent-server` disponível no npm.

- [ ] Estrutura de pacote npm (`package.json`, `tsconfig.json`)
- [ ] Fastify server (3 endpoints)
- [ ] Worker Threads pool
- [ ] Fila in-memory
- [ ] Peer dependency: `@ericnunes/frame-agent-sdk`
- [ ] Job results com TTL
- [ ] Health check
- [ ] Exportar `serveGraph()`
- [ ] Preparar para publicação npm

### Fase 2: CLI & Template (Semana 2)
**Objetivo:** Adicionar binário CLI e template GitHub.

- [ ] CLI `frame-agent-server` (npm bin)
- [ ] Template GitHub `template-frame-agent`
- [ ] Dockerfile
- [ ] docker-compose.yml

### Fase 3: Produção (Semana 3)
**Objetivo:** Produção-ready, publicar v1.0.0.

- [ ] Graceful shutdown
- [ ] Métricas (Prometheus)
- [ ] Rate limiting
- [ ] Testes
- [ ] Documentação
- [ ] Publicar v1.0.0 no npm

---

## Documentos Criados

1. **ARCHITECTURE-v2.md** - Arquitetura completa atualizada
2. **implementation-guide-v2.md** - Guia de implementação detalhado
3. **DECISIONS.md** - Este documento (resumo das decisões)

---

## Próximos Passos

1. ✅ Documentação finalizada
2. ⏳ Implementação (delegar para engenharia)
3. ⏳ Criar template GitHub
4. ⏳ CI/CD com Docker Swarm

---

## Checklist para Implementação

- [ ] Interface `serveGraph(graph: GraphEngine, options)`
- [ ] Classe `JobQueue` (in-memory)
- [ ] Classe `WorkerPool` (Worker Threads)
- [ ] Rotas Fastify (3 endpoints)
- [ ] CLI com `cac`
- [ ] Template GitHub
- [ ] Dockerfile
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Documentação

---

**Status:** ✅ Arquitetura finalizada e documentada. Pronto para implementação.
