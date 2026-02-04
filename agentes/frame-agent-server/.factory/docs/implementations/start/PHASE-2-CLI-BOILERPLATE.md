# Fase 2: CLI & Boilerplate

**Fase:** 2  
**Semana:** 2  
**Status:** Pronto para implementação  
**Tempo estimado:** 1 semana (5 dias)

---

## Objetivo

Criar CLI para gerenciar projetos de agentes e templates/boilerplates para facilitar o desenvolvimento.

---

## Visão Geral

Na Fase 2, o usuário poderá:

```bash
# Criar novo projeto de agente
npx @ericnunes/frame-agent-server create my-agent

# Estrutura criada:
# my-agent/
# ├── src/
# │   ├── graph.ts          # Define o grafo
# │   ├── index.ts          # Entry point
# │   └── graph.factory.ts  # Factory para workers
# ├── package.json
# ├── tsconfig.json
# └── Dockerfile
```

---

## Tarefas

### Day 1: CLI Setup
- [ ] Criar estrutura do CLI
- [ ] Configurar commander.js
- [ ] Comando `create` básico
- [ ] Instalação de dependências

### Day 2: Templates
- [ ] Criar template básico
- [ ] Template com múltiplos nós
- [ ] Template com tools
- [ ] Sistema de scaffolding

### Day 3: CLI Avançado
- [ ] Comando `dev` (modo desenvolvimento)
- [ ] Comando `build` (compilação)
- [ ] Comando `start` (produção)
- [ ] Hot reload

### Day 4: Docker & Deploy
- [ ] Dockerfile template
- [ ] docker-compose.yml
- [ ] Scripts de deploy
- [ ] Configuração Kubernetes

### Day 5: Documentação & Exemplos
- [ ] Documentação do CLI
- [ ] Exemplos de projetos
- [ ] Tutorial passo a passo
- [ ] Vídeo/gif demonstrativo

---

## Estrutura do CLI

```
frame-agent-server/
├── src/
│   ├── cli/
│   │   ├── index.ts           # Entry point do CLI
│   │   ├── commands/
│   │   │   ├── create.ts      # Comando create
│   │   │   ├── dev.ts         # Comando dev
│   │   │   ├── build.ts       # Comando build
│   │   │   └── start.ts       # Comando start
│   │   ├── templates/
│   │   │   ├── basic/         # Template básico
│   │   │   ├── advanced/      # Template avançado
│   │   │   └── with-tools/    # Template com tools
│   │   └── utils/
│   │       ├── fs.ts          # Utilitários de arquivo
│   │       └── logger.ts      # Logger do CLI
```

---

## Arquivos a Criar

### src/cli/index.ts
```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from './commands/create';
import { devCommand } from './commands/dev';
import { buildCommand } from './commands/build';
import { startCommand } from './commands/start';

const program = new Command();

program
  .name('frame-agent-server')
  .description('CLI for Frame Agent Server')
  .version('1.0.0');

program
  .command('create <name>')
  .description('Create a new agent project')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .option('-d, --directory <directory>', 'Directory to create project in', '.')
  .action(createCommand);

program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .option('-w, --workers <workers>', 'Number of workers', '4')
  .action(devCommand);

program
  .command('build')
  .description('Build the project for production')
  .action(buildCommand);

program
  .command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .action(startCommand);

program.parse();
```

### src/cli/commands/create.ts
```typescript
import { resolve, join } from 'path';
import { mkdir, writeFile, cp } from 'fs/promises';
import { existsSync } from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('create');

interface CreateOptions {
  template: string;
  directory: string;
}

const templatesDir = resolve(__dirname, '../templates');

export async function createCommand(name: string, options: CreateOptions): Promise<void> {
  const targetDir = resolve(options.directory, name);

  // Verificar se diretório já existe
  if (existsSync(targetDir)) {
    logger.error(`Directory ${name} already exists`);
    process.exit(1);
  }

  logger.info(`Creating new agent project: ${name}`);
  logger.info(`Template: ${options.template}`);
  logger.info(`Directory: ${targetDir}`);

  try {
    // Criar diretório
    await mkdir(targetDir, { recursive: true });
    await mkdir(join(targetDir, 'src'), { recursive: true });

    // Copiar template
    const templateDir = join(templatesDir, options.template);
    
    if (!existsSync(templateDir)) {
      logger.error(`Template ${options.template} not found`);
      logger.info(`Available templates: basic, advanced, with-tools`);
      process.exit(1);
    }

    // Copiar arquivos do template
    await copyTemplate(templateDir, targetDir, name);

    logger.success(`\n✅ Project ${name} created successfully!`);
    logger.info(`\nNext steps:`);
    logger.info(`  cd ${name}`);
    logger.info(`  npm install`);
    logger.info(`  npm run dev`);
  } catch (error) {
    logger.error('Failed to create project:', error);
    process.exit(1);
  }
}

async function copyTemplate(templateDir: string, targetDir: string, projectName: string): Promise<void> {
  const files = [
    { src: 'src/graph.ts', dest: 'src/graph.ts' },
    { src: 'src/index.ts', dest: 'src/index.ts' },
    { src: 'src/graph.factory.ts', dest: 'src/graph.factory.ts' },
    { src: 'package.json', dest: 'package.json' },
    { src: 'tsconfig.json', dest: 'tsconfig.json' },
    { src: '.env.example', dest: '.env.example' },
    { src: '.gitignore', dest: '.gitignore' },
    { src: 'Dockerfile', dest: 'Dockerfile' },
    { src: 'README.md', dest: 'README.md' }
  ];

  for (const file of files) {
    const srcPath = join(templateDir, file.src);
    const destPath = join(targetDir, file.dest);

    if (existsSync(srcPath)) {
      let content = await readFile(srcPath, 'utf-8');
      
      // Substituir placeholders
      content = content.replace(/{{PROJECT_NAME}}/g, projectName);
      
      await writeFile(destPath, content);
      logger.info(`  Created: ${file.dest}`);
    }
  }
}

async function readFile(path: string, encoding: BufferEncoding): Promise<string> {
  const { readFile } = await import('fs/promises');
  return readFile(path, encoding);
}
```

### src/cli/templates/basic/src/graph.ts
```typescript
/**
 * Graph Definition
 * 
 * Define your agent graph here using the Frame Agent SDK.
 */

import { GraphEngine, createAgentNode } from '@ericnunes/frame-agent-sdk';

export function createGraph() {
  return new GraphEngine({
    nodes: {
      agent: createAgentNode({
        llm: { 
          model: process.env.MODEL || 'gpt-4o-mini',
          apiKey: process.env.OPENAI_API_KEY! 
        },
        mode: 'react',
        agentInfo: { 
          name: 'Assistant', 
          goal: 'Help users with their questions',
          backstory: 'A helpful AI assistant'
        }
      })
    },
    edges: { agent: 'END' },
    entryPoint: 'agent'
  });
}
```

### src/cli/templates/basic/src/index.ts
```typescript
/**
 * Entry Point
 * 
 * Start the server with your graph.
 */

import { serveGraph } from '@ericnunes/frame-agent-server';
import { createGraph } from './graph';

const graph = createGraph();

serveGraph(graph, {
  port: parseInt(process.env.PORT || '3000'),
  workers: parseInt(process.env.WORKERS || '4'),
  jobTTL: parseInt(process.env.JOB_TTL || '3600000'),
  maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '100')
}).catch(console.error);
```

### src/cli/templates/basic/src/graph.factory.ts
```typescript
/**
 * Graph Factory
 * 
 * Export for worker threads.
 */

import { createGraph } from './graph';

const graph = createGraph();

module.exports = { graph };
module.exports.default = graph;
```

### src/cli/templates/basic/package.json
```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "description": "Frame Agent Server project",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "docker:build": "docker build -t {{PROJECT_NAME}} .",
    "docker:run": "docker run -p 3000:3000 --env-file .env {{PROJECT_NAME}}"
  },
  "dependencies": {
    "@ericnunes/frame-agent-server": "^1.0.0",
    "@ericnunes/frame-agent-sdk": "^0.0.6",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### src/cli/templates/basic/tsconfig.json
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
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### src/cli/templates/basic/.env.example
```env
# Server
PORT=3000
WORKERS=4

# LLM
OPENAI_API_KEY=your-api-key-here
MODEL=gpt-4o-mini

# Optional
LOG_LEVEL=info
```

### src/cli/templates/basic/.gitignore
```gitignore
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

### src/cli/templates/basic/Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start
CMD ["npm", "start"]
```

### src/cli/templates/basic/README.md
```markdown
# {{PROJECT_NAME}}

Frame Agent Server project created with `@ericnunes/frame-agent-server`.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Test the API:
   ```bash
   curl -X POST http://localhost:3000/execute \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
   ```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container

## Project Structure

```
src/
├── graph.ts          # Graph definition
├── index.ts          # Entry point
└── graph.factory.ts  # Factory for workers
```

## Customization

Edit `src/graph.ts` to customize your agent graph. See the [Frame Agent SDK documentation](https://github.com/ericnunes/frame-agent-sdk) for more details.

## Deployment

### Docker

```bash
npm run docker:build
npm run docker:run
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `WORKERS` | `4` | Number of worker threads |
| `OPENAI_API_KEY` | - | OpenAI API key |
| `MODEL` | `gpt-4o-mini` | LLM model |
| `LOG_LEVEL` | `info` | Log level |
```

### src/cli/commands/dev.ts
```typescript
import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';

const logger = createLogger('dev');

interface DevOptions {
  port: string;
  workers: string;
}

export function devCommand(options: DevOptions): void {
  logger.info('Starting development server...');
  logger.info(`Port: ${options.port}`);
  logger.info(`Workers: ${options.workers}`);

  const env = {
    ...process.env,
    PORT: options.port,
    WORKERS: options.workers,
    NODE_ENV: 'development'
  };

  const child = spawn('tsx', ['watch', 'src/index.ts'], {
    stdio: 'inherit',
    env
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}
```

### src/cli/commands/build.ts
```typescript
import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';

const logger = createLogger('build');

export function buildCommand(): void {
  logger.info('Building project...');

  const child = spawn('tsc', [], {
    stdio: 'inherit'
  });

  child.on('close', (code) => {
    if (code === 0) {
      logger.success('Build completed successfully!');
    } else {
      logger.error('Build failed');
    }
    process.exit(code || 0);
  });
}
```

### src/cli/commands/start.ts
```typescript
import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';

const logger = createLogger('start');

interface StartOptions {
  port: string;
}

export function startCommand(options: StartOptions): void {
  logger.info('Starting production server...');
  logger.info(`Port: ${options.port}`);

  const env = {
    ...process.env,
    PORT: options.port,
    NODE_ENV: 'production'
  };

  const child = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}
```

### src/cli/utils/logger.ts
```typescript
import chalk from 'chalk';

export function createLogger(name: string) {
  const prefix = chalk.blue(`[${name}]`);

  return {
    info: (...args: any[]) => {
      console.log(prefix, ...args);
    },
    success: (...args: any[]) => {
      console.log(chalk.green('✓'), ...args);
    },
    warn: (...args: any[]) => {
      console.log(chalk.yellow('⚠'), ...args);
    },
    error: (...args: any[]) => {
      console.error(chalk.red('✗'), ...args);
    }
  };
}
```

---

## Dependências do CLI

```bash
# Adicionar ao package.json principal
npm install commander chalk
npm install -D @types/node
```

### Atualização do package.json principal
```json
{
  "name": "@ericnunes/frame-agent-server",
  "version": "1.0.0",
  "description": "HTTP server for exposing GraphEngine execution graphs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "frame-agent-server": "dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.0",
    "@fastify/rate-limit": "^8.0.0",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
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
  "peerDependencies": {
    "@ericnunes/frame-agent-sdk": "^0.0.6"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## Uso do CLI

```bash
# Instalar globalmente
npm install -g @ericnunes/frame-agent-server

# Ou usar via npx
npx @ericnunes/frame-agent-server create my-agent

# Comandos disponíveis
frame-agent-server create my-agent           # Criar projeto
frame-agent-server create my-agent -t advanced  # Template avançado
frame-agent-server dev                       # Modo dev
frame-agent-server build                     # Build
frame-agent-server start                     # Produção
```

---

## Checklist da Fase 2

### CLI
- [ ] Comando `create` funcionando
- [ ] Comando `dev` com hot reload
- [ ] Comando `build` funcionando
- [ ] Comando `start` funcionando
- [ ] Templates copiados corretamente

### Templates
- [ ] Template `basic` criado
- [ ] Template `advanced` criado (opcional)
- [ ] Template `with-tools` criado (opcional)
- [ ] Todos os arquivos do template funcionando

### Docker
- [ ] Dockerfile template
- [ ] docker-compose.yml (opcional)
- [ ] Health check configurado

### Documentação
- [ ] README do CLI
- [ ] Documentação de comandos
- [ ] Exemplos de uso

---

## Notas

1. **CLI é opcional na Fase 1** - A Fase 1 foca na biblioteca core
2. **Templates facilitam onboarding** - Usuário começa em minutos
3. **Comando `dev` com tsx** - Hot reload sem configuração
4. **Docker pronto** - Deploy simplificado

---

## Próximos Passos

Após a Fase 2:
- Publicar no npm
- Criar documentação completa
- Criar exemplos adicionais
- Coletar feedback da comunidade
