# Proposta Arquitetônica: Templates/Basic (Revisada)

## Status
**Data:** 2026-02-05  
**Autor:** Senior Architect  
**Contexto:** frame-agent-server publicado, template deve ser esqueleto mínimo

---

## 1. Filosofia

O template `basic` é um **esqueleto vazio**, não um exemplo. O desenvolvedor começa do zero e define tudo.

- ❌ Sem factories
- ❌ Sem arquitetura de pastas complexa
- ❌ Sem exemplos de código pronto
- ✅ Apenas estrutura mínima
- ✅ Configuração centralizada (dotenv)
- ✅ Comentários orientativos

---

## 2. Estrutura Proposta

```
templates/basic/
├── src/
│   ├── server.ts         # Inicia servidor (não alterar)
│   ├── config.ts         # Carrega dotenv + exporta configs
│   └── graph.ts          # VAZIO - desenvolvedor cria do zero
├── .env.example          # Variáveis que o servidor precisa
├── package.json
└── tsconfig.json
```

---

## 3. Especificação dos Arquivos

### 3.1 `src/config.ts`

Carrega `dotenv` uma única vez. Todas as variáveis ficam acessíveis no projeto.

```typescript
import 'dotenv/config';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  workers: parseInt(process.env.WORKERS || '4', 10),
  
  // Adicione suas configurações aqui
  // openaiApiKey: process.env.OPENAI_API_KEY,
  // model: process.env.LLM_MODEL || 'gpt-4o-mini',
};
```

### 3.2 `src/graph.ts`

**ARQUIVO VAZIO** - apenas com comentários orientativos.

```typescript
/**
 * Defina seu grafo aqui.
 * 
 * Exemplo básico:
 * 
 * import { createGraph } from '@ericnunes/frame-agent-sdk';
 * 
 * export const graph = createGraph({
 *   id: 'meu-agente',
 *   name: 'Meu Agente',
 *   nodes: [
 *     { id: 'start', type: 'input', data: {} },
 *     { id: 'agent', type: 'agent', data: { agentId: 'assistant' } },
 *     { id: 'end', type: 'output', data: {} }
 *   ],
 *   edges: [
 *     { source: 'start', target: 'agent' },
 *     { source: 'agent', target: 'end' }
 *   ]
 * });
 */

// Implemente seu grafo abaixo:
```

### 3.3 `src/server.ts`

Entry point fixo. Não deve ser modificado pelo desenvolvedor.

```typescript
import { serveGraph } from '@ericnunes/frame-agent-server';
import { config } from './config';
import { graph } from './graph';

async function main() {
  await serveGraph(graph, {
    port: config.port,
    host: config.host,
    workers: config.workers
  });
}

main();
```

---

## 4. Variáveis de Ambiente (.env.example)

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
WORKERS=4
NODE_ENV=development

# Adicione suas variáveis abaixo:
# OPENAI_API_KEY=sk-...
# LLM_MODEL=gpt-4o-mini
```

---

## 5. Checklist de Implementação

- [ ] Criar `src/config.ts` com dotenv
- [ ] Criar `src/graph.ts` vazio (só comentários)
- [ ] Renomear/criar `src/server.ts` (antigo index.ts)
- [ ] Atualizar `package.json` -> `"main": "dist/server.js"`
- [ ] Atualizar scripts no `package.json` -> `"start": "node dist/server.js"`
- [ ] Atualizar `.env.example` (mínimo necessário)
- [ ] Remover `graph.factory.ts` (não terá mais)
- [ ] Testar `npm run dev` (deve falhar até graph.ts ser implementado)
- [ ] Atualizar README do template explicando a filosofia

---

## 6. O Que NÃO Terá

- ❌ `graph.factory.ts` - quem define é o dev
- ❌ Pasta `agents/` - o dev cria se quiser
- ❌ Pasta `tools/` - o dev cria se quiser
- ❌ Pasta `nodes/` - o dev cria se quiser
- ❌ Exemplos de código funcionando
- ❌ Testes no template

---

## 7. Próximos Passos

1. **Aprovar proposta revisada**
2. **Implementar** (pode delegar para `/junior-programming`)
3. **Testar** estrutura mínima
4. **Documentar** no README: "Este template é um esqueleto vazio..."

---

**Fim da Proposta**
