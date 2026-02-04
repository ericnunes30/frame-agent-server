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
