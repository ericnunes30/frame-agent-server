import { resolve, join, normalize } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('create');

interface CreateOptions {
  template: string;
  directory: string;
}

const ALLOWED_TEMPLATES = ['basic', 'advanced', 'with-tools'];

// Templates are at project root, go up 3 levels from src/cli/commands/
const templatesDir = resolve(__dirname, '../../../templates');

function validateProjectName(name: string): void {
  const npmNamePattern = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  if (!npmNamePattern.test(name)) {
    logger.error(`Invalid project name: ${name}`);
    logger.info('Project names must follow npm package naming conventions');
    process.exit(1);
  }
}

export async function createCommand(name: string, options: CreateOptions): Promise<void> {
  // Validate project name
  validateProjectName(name);

  // Validate template
  if (!ALLOWED_TEMPLATES.includes(options.template)) {
    logger.error(`Invalid template: ${options.template}`);
    logger.info(`Available templates: ${ALLOWED_TEMPLATES.join(', ')}`);
    process.exit(1);
  }

  // Check for path traversal in raw inputs
  if (name.includes('..') || options.directory.includes('..')) {
    logger.error('Invalid directory path: path traversal not allowed');
    process.exit(1);
  }

  // Resolve the path
  const targetDir = resolve(options.directory, name);

  // Improved path traversal protection
  const resolvedDir = normalize(resolve(options.directory, name));
  const parentDir = normalize(resolve(options.directory));

  if (!resolvedDir.startsWith(parentDir)) {
    logger.error('Invalid directory path: path traversal not allowed');
    process.exit(1);
  }

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
    // Cleanup: remove partially created directory on error
    if (existsSync(targetDir)) {
      logger.info('Cleaning up partially created directory...');
      await rm(targetDir, { recursive: true, force: true });
    }
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
      content = content.replace(/__PROJECT_NAME__/g, projectName);
      
      await writeFile(destPath, content);
      logger.info(`  Created: ${file.dest}`);
    }
  }
}

async function readFile(path: string, encoding: BufferEncoding): Promise<string> {
  const { readFile } = await import('fs/promises');
  return readFile(path, encoding);
}
