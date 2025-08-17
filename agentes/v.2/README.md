# Framework de Agentes - Arquitetura SOLID

Framework de agentes baseado em princípios SOLID e padrões de projeto para execução de tarefas com LLMs.

## 🏗️ Arquitetura

### Princípios Fundamentais

- **Estado via HTTP**: Gerenciamento agnóstico a clientes
- **Comunicação SSE**: Atualizações em tempo real  
- **Independência de SDKs**: HTTP direto com axios
- **Arquitetura SOLID**: Extensível e manutenível

### Estrutura em Camadas

```
src/
├── core/                    # Lógica de negócio principal
│   ├── agents/              # Sistema de agentes (Strategy Pattern)
│   ├── orchestration/types/ # Tipos de domínio
│   └── state/              # Gerenciamento de estado (State Pattern)
├── infrastructure/         # Adaptadores e infraestrutura  
│   ├── adapters/llm/       # Adaptadores LLM (Adapter Pattern)
│   ├── tools/              # Sistema de ferramentas
│   ├── config/             # Configuração centralizada
│   └── di/                 # Injeção de dependência
└── entrypoints/            # Camada de entrada HTTP
```

## 🎯 Padrões de Projeto

### Strategy Pattern
- [`IAgent`](src/core/agents/IAgent.ts) - Agentes intercambiáveis
- [`ITool`](src/infrastructure/tools/ITool.ts) - Ferramentas intercambiáveis
- [`ILlmApi`](src/infrastructure/adapters/llm/ILlmApi.ts) - Provedores LLM

### Factory Pattern  
- [`AgentFactory`](src/core/agents/AgentFactory.ts) - Criação sem condicionais
- [`ToolRegistry`](src/infrastructure/tools/registry/ToolRegistry.ts) - Registro central

### State Pattern
- [`IExecutionState`](src/core/state/IExecutionState.ts) - Estados de execução
- [`StateManager`](src/core/state/StateManager.ts) - Gerenciador de transições

### Adapter Pattern
- [`ILlmApi`](src/infrastructure/adapters/llm/ILlmApi.ts) - Abstração de APIs externas

## 📚 Componentes Principais

### Tipos de Domínio
- [`ExecutionId`](src/core/orchestration/types/ExecutionId.ts) - IDs únicos validados
- [`Task`](src/core/orchestration/types/Task.ts) - Encapsulamento de tarefas
- [`TaskResult`](src/core/orchestration/types/TaskResult.ts) - Resultados estruturados

### Configuração
- [`IConfigurationService`](src/infrastructure/config/IConfigurationService.ts) - Interface abstraída
- [`ConfigurationService`](src/infrastructure/config/ConfigurationService.ts) - Implementação

### Injeção de Dependência
- [`DI_TOKENS`](src/infrastructure/di/tokens.ts) - Tokens centralizados
- [`DIContainer`](src/infrastructure/di/Container.ts) - Container configurado

### Gerenciamento de Contexto
- [`ContextManager`](src/core/state/ContextManager.ts) - Memória estratégica
- [`StateManager`](src/core/state/StateManager.ts) - Estados de execução

## 🚀 Início Rápido

```typescript
import { setupDIContainer, container } from '@infrastructure/di/Container';
import { DI_TOKENS } from '@infrastructure/di/tokens';

// Configurar DI
setupDIContainer();

// Resolver serviços
const configService = container.resolve(DI_TOKENS.IConfigurationService);
const agentFactory = container.resolve(DI_TOKENS.IAgentFactory);
```

## 🔧 Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar testes
npm test

# Lint
npm run lint

# Build
npm run build
```

## 📋 Status do Projeto

**Fase 1 - Fundação**: ✅ **100% Concluída**

- ✅ Ambiente de desenvolvimento
- ✅ Estrutura de pastas  
- ✅ Tipos de domínio
- ✅ Interfaces fundamentais
- ✅ Padrões de projeto
- ✅ Sistema de configuração
- ✅ Injeção de dependência
- ✅ Gerenciamento de contexto
- ✅ Documentação

**Próximas Fases**: Agentes concretos, orquestrador, comunicação HTTP/SSE