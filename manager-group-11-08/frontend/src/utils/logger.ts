const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export default logger;
