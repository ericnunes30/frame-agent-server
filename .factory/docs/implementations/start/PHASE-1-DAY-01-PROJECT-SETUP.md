# Fase 1 - Day 1: Project Setup & Dependencies

**Fase:** 1 - Core Library  
**Dia:** 1  
**Status:** Pronto para implementação  
**Tempo estimado:** 4-6 horas

---

## Objetivo

Configurar a estrutura base do pacote npm `@ericnunes/frame-agent-server` com TypeScript, dependências e estrutura de pastas. **Nenhum agente é criado aqui** - apenas a base do servidor.

---

## Tarefas

### 1.1 Estrutura de Pacote npm
- [ ] Criar `package.json` com configurações corretas
- [ ] Configurar `tsconfig.json` com strict mode
- [ ] Criar `.gitignore` e `.env.example`
- [ ] Configurar Jest para testes

### 1.2 Instalar Dependências de Produção
- [ ] `fastify@^5.7.2` - Servidor HTTP
- [ ] `@fastify/cors@^10.0.0` - CORS support
- [ ] `@fastify/rate-limit@^8.0.0` - Rate limiting
- [ ] `pino@^10.3.0` - Logging estruturado
- [ ] `pino-http@^10.0.0` - Middleware Fastify
- [ ] `dotenv@^16.4.0` - Variáveis de ambiente

### 1.3 Instalar Dependências de Desenvolvimento
- [ ] `typescript@^5.5.0` - TypeScript
- [ ] `@types/node@^20.0.0` - Tipos do Node
- [ ] `tsx@^4.0.0` - Executor TypeScript
- [ ] `jest@^29.0.0` - Framework de testes
- [ ] `@types/jest@^29.0.0` - Tipos Jest
- [ ] `ts-jest@^29.0.0` - Transformador Jest para TS

### 1.4 Criar Estrutura de Pastas
```
frame-agent-server/
├── src/
│   ├── types/
│   │   └── index.ts
│   ├── manager/
│   │   └── JobManager.ts
│   ├── workers/
│   │   ├── WorkerPool.ts
│   │   └── graph.worker.ts
│   ├── server/
│   │   └── index.ts
│   ├── routes/
│   │   ├── execute.ts
│   │   └── health.ts
│   ├── utils/
│   │   └── logger.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   │   ├── manager/
│   │   ├── workers/
│   │   └── utils/
│   └── integration/
│       └── server.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── .env.example
```

---

## Arquivos a Criar

### package.json
```json
{
  "name": "@ericnunes/frame-agent-server",
  "version": "1.0.0",
  "description": "HTTP server for exposing GraphEngine execution graphs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "tsc --noEmit"
  },
  "keywords": [
    "agent",
    "graph",
    "server",
    "fastify",
    "worker-threads"
  ],
  "author": "Eric Nunes",
  "license": "MIT",
  "peerDependencies": {
    "@ericnunes/frame-agent-sdk": "^0.0.6"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.0",
    "@fastify/rate-limit": "^8.0.0",
    "dotenv": "^16.4.0",
    "fastify": "^5.7.2",
    "pino": "^10.3.0",
    "pino-http": "^10.0.0"
  },
  "devDependencies": {
    "@ericnunes/frame-agent-sdk": "^0.0.6",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### jest.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

### .env.example
```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Worker Configuration
WORKERS=4
MAX_QUEUE_SIZE=100
JOB_TTL=3600000
CLEANUP_INTERVAL=60000
SHUTDOWN_TIMEOUT=60000

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=60000

# Logging
LOG_LEVEL=info
```

### .gitignore
```gitignore
# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Testing
coverage/
.nyc_output/

# IDE
.vscode/*
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS
.DS_Store
Thumbs.db
```

### tests/setup.ts
```typescript
// Jest setup file
beforeAll(() => {
  // Global setup
});

afterAll(() => {
  // Global teardown
});
```

---

## Comandos de Instalação

```bash
# Criar pasta do projeto
mkdir -p frame-agent-server
cd frame-agent-server

# Inicializar npm
npm init -y

# Instalar dependências de produção
npm install fastify@^5.7.2 @fastify/cors@^10.0.0 @fastify/rate-limit@^8.0.0 pino@^10.3.0 pino-http@^10.0.0 dotenv@^16.4.0

# Instalar dependências de desenvolvimento
npm install -D typescript@^5.5.0 @types/node@^20.0.0 tsx@^4.0.0 jest@^29.0.0 @types/jest@^29.0.0 ts-jest@^29.0.0

# Instalar peer dependency para desenvolvimento
npm install -D @ericnunes/frame-agent-sdk@^0.0.6

# Criar estrutura de pastas
mkdir -p src/{types,manager,workers,server,routes,utils}
mkdir -p tests/{unit/{manager,workers,utils},integration}
```

---

## Notas Críticas

1. **Server importa SDK como peer dependency** - `GraphEngine` é usado diretamente
2. **TypeScript strict mode obrigatório** - Configuração rigorosa de tipos
3. **O server é infraestrutura pura** - Não conhece nós, edges, tools ou configuração do grafo
4. **Worker Threads serão implementados no Day 3** - Hoje é apenas setup
5. **Nenhum agente é criado aqui** - Apenas base do servidor

---

## Critérios de Conclusão

- [ ] `package.json` criado com peer dependency do SDK
- [ ] `tsconfig.json` com strict mode configurado
- [ ] Jest configurado para testes
- [ ] Estrutura de pastas criada
- [ ] Todas as dependências instaladas sem erros
- [ ] `npm run build` executa sem erros (mesmo sem arquivos src)
- [ ] `npm test` executa sem erros (mesmo sem testes)

---

## Próximo Passo

Após completar este dia, prossiga para: **Fase 1 - Day 2: Type Definitions & Job Queue**
