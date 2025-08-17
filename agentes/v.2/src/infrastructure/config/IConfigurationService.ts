/**
 * Interface para serviço de configuração centralizada.
 * Abstrai a fonte de configuração e fornece acesso tipado.
 * 
 * Permite desacoplamento da infraestrutura de configuração
 * (arquivo, variáveis de ambiente, serviços externos).
 * 
 * @example
 * ```typescript
 * class MyService {
 *   constructor(
 *     @inject('IConfigurationService') private config: IConfigurationService
 *   ) {}
 * 
 *   async doSomething(): Promise<void> {
 *     const apiKey = this.config.get('llm.openai.apiKey');
 *     const timeout = this.config.get('server.timeout', 30000);
 *   }
 * }
 * ```
 */
export interface IConfigurationService {
  /**
   * Obtém valor de configuração por chave.
   * Suporta notação de ponto para objetos aninhados.
   * 
   * @param key - Chave da configuração (ex: 'server.port', 'llm.openai.apiKey')
   * @param defaultValue - Valor padrão se a chave não existir
   * @returns Valor da configuração ou valor padrão
   */
  get<T = any>(key: string, defaultValue?: T): T;

  /**
   * Verifica se uma chave de configuração existe.
   */
  has(key: string): boolean;

  /**
   * Obtém todas as configurações como objeto.
   * Útil para debugging ou inicialização.
   */
  getAll(): Record<string, unknown>;

  /**
   * Obtém configurações de uma seção específica.
   * 
   * @param section - Nome da seção (ex: 'server', 'llm')
   * @returns Objeto com configurações da seção
   */
  getSection<T = Record<string, unknown>>(section: string): T;

  /**
   * Valida se todas as configurações obrigatórias estão presentes.
   * @returns Array de chaves faltantes
   */
  validateRequired(): readonly string[];

  /**
   * Recarrega configurações da fonte.
   * Útil para configurações que podem mudar em runtime.
   */
  reload(): Promise<void>;
}

/**
 * Configurações do servidor HTTP.
 */
export interface ServerConfiguration {
  readonly port: number;
  readonly host: string;
  readonly timeout: number;
}

/**
 * Configurações de LLM.
 */
export interface LlmConfiguration {
  readonly openai: {
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly model: string;
    readonly timeout: number;
  };
  readonly openrouter: {
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly model: string;
    readonly timeout: number;
  };
}

/**
 * Configurações do Redis.
 */
export interface RedisConfiguration {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly database: number;
  readonly timeout: number;
}

/**
 * Configurações de logging.
 */
export interface LoggingConfiguration {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly format: 'json' | 'text';
  readonly sentry?: {
    readonly dsn: string;
    readonly environment: string;
  };
}

/**
 * Configurações de SSE.
 */
export interface SseConfiguration {
  readonly heartbeatInterval: number;
  readonly connectionTimeout: number;
  readonly maxConnections: number;
}

/**
 * Configuração completa da aplicação.
 * Define estrutura tipada de todas as configurações.
 */
export interface ApplicationConfiguration {
  readonly server: ServerConfiguration;
  readonly llm: LlmConfiguration;
  readonly redis: RedisConfiguration;
  readonly logging: LoggingConfiguration;
  readonly sse: SseConfiguration;
}

/**
 * Chaves obrigatórias que devem estar presentes.
 */
export const REQUIRED_CONFIG_KEYS = [
  'server.port',
  'server.host',
  'llm.openai.apiKey',
  'llm.openrouter.apiKey',
  'redis.host',
  'redis.port'
] as const;

/**
 * Valores padrão para configurações opcionais.
 */
export const DEFAULT_CONFIG_VALUES = {
  'server.timeout': 30000,
  'server.host': 'localhost',
  'llm.openai.timeout': 30000,
  'llm.openrouter.timeout': 30000,
  'redis.database': 0,
  'redis.timeout': 5000,
  'logging.level': 'info',
  'logging.format': 'json',
  'sse.heartbeatInterval': 30000,
  'sse.connectionTimeout': 300000,
  'sse.maxConnections': 1000
} as const;