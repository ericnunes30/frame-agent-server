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
