import 'reflect-metadata';
import { injectable } from 'tsyringe';
import * as config from 'config';
import type {
  IConfigurationService,
  ApplicationConfiguration,
  ServerConfiguration,
  LlmConfiguration,
  RedisConfiguration
} from './IConfigurationService';
import {
  REQUIRED_CONFIG_KEYS,
  DEFAULT_CONFIG_VALUES
} from './IConfigurationService';

/**
 * Implementação do serviço de configuração usando node-config.
 * Fornece acesso centralizado e tipado às configurações da aplicação.
 * 
 * Responsabilidades:
 * - Carregar configurações de múltiplas fontes (arquivos, env vars)
 * - Fornecer acesso tipado às configurações
 * - Validar configurações obrigatórias
 * - Aplicar valores padrão
 * 
 * @example
 * ```typescript
 * const configService = container.resolve(ConfigurationService);
 * 
 * const port = configService.get('server.port', 3000);
 * const llmConfig = configService.getSection<LlmConfiguration>('llm');
 * ```
 */
@injectable()
export class ConfigurationService implements IConfigurationService {
  private readonly configuration: Record<string, unknown>;
  private readonly requiredKeys: readonly string[];

  constructor() {
    this.configuration = this.loadConfiguration();
    this.requiredKeys = REQUIRED_CONFIG_KEYS;
    this.applyDefaults();
    this.validateConfiguration();
  }

  /**
   * Obtém valor por chave com suporte a notação de ponto.
   */
  get<T = any>(key: string, defaultValue?: T): T {
    try {
      if (config.has(key)) {
        return config.get<T>(key);
      }
      
      if (defaultValue !== undefined) {
        return defaultValue;
      }

      throw new Error(`Configuração '${key}' não encontrada`);
    } catch (error) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Erro ao obter configuração '${key}': ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Verifica se chave existe.
   */
  has(key: string): boolean {
    return config.has(key);
  }

  /**
   * Obtém todas as configurações.
   */
  getAll(): Record<string, unknown> {
    return { ...this.configuration };
  }

  /**
   * Obtém seção específica das configurações.
   */
  getSection<T = Record<string, unknown>>(section: string): T {
    return this.get<T>(section, {} as T);
  }

  /**
   * Valida configurações obrigatórias.
   */
  validateRequired(): readonly string[] {
    const missing: string[] = [];

    for (const key of this.requiredKeys) {
      if (!this.has(key)) {
        missing.push(key);
      }
    }

    return missing;
  }

  /**
   * Recarrega configurações.
   * Nota: node-config não suporta reload nativo, 
   * esta implementação recrearia o serviço.
   */
  async reload(): Promise<void> {
    // Para implementação futura com hot-reload
    throw new Error('Reload de configuração não implementado');
  }

  /**
   * Obtém configurações tipadas do servidor.
   */
  getServerConfig(): ServerConfiguration {
    return {
      port: this.get('server.port'),
      host: this.get('server.host'),
      timeout: this.get('server.timeout')
    };
  }

  /**
   * Obtém configurações tipadas de LLM.
   */
  getLlmConfig(): LlmConfiguration {
    return {
      openai: {
        baseUrl: this.get('llm.openai.baseUrl'),
        apiKey: this.get('llm.openai.apiKey'),
        model: this.get('llm.openai.model'),
        timeout: this.get('llm.openai.timeout')
      },
      openrouter: {
        baseUrl: this.get('llm.openrouter.baseUrl'),
        apiKey: this.get('llm.openrouter.apiKey'),
        model: this.get('llm.openrouter.model'),
        timeout: this.get('llm.openrouter.timeout')
      }
    };
  }

  /**
   * Obtém configurações tipadas do Redis.
   */
  getRedisConfig(): RedisConfiguration {
    return {
      host: this.get('redis.host'),
      port: this.get('redis.port'),
      password: this.get('redis.password'),
      database: this.get('redis.database'),
      timeout: this.get('redis.timeout')
    };
  }

  private loadConfiguration(): Record<string, unknown> {
    try {
      // node-config automaticamente carrega configurações baseado em NODE_ENV
      return config.util.toObject();
    } catch (error) {
      throw new Error(`Falha ao carregar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private applyDefaults(): void {
    // Aplicar valores padrão para configurações que não foram definidas
    for (const [key, defaultValue] of Object.entries(DEFAULT_CONFIG_VALUES)) {
      if (!this.has(key)) {
        // Como node-config é imutável, registramos os padrões na nossa cópia
        this.setNestedValue(this.configuration, key, defaultValue);
      }
    }
  }

  private validateConfiguration(): void {
    const missing = this.validateRequired();
    
    if (missing.length > 0) {
      throw new Error(
        `Configurações obrigatórias faltando: ${missing.join(', ')}\n` +
        'Verifique seu arquivo de configuração ou variáveis de ambiente.'
      );
    }

    // Validações adicionais
    this.validateServerConfig();
    this.validateLlmConfig();
  }

  private validateServerConfig(): void {
    const port = this.get('server.port');
    
    if (typeof port !== 'number' || port < 1 || port > 65535) {
      throw new Error('server.port deve ser um número entre 1 e 65535');
    }
  }

  private validateLlmConfig(): void {
    const openaiKey = this.get('llm.openai.apiKey');
    const openrouterKey = this.get('llm.openrouter.apiKey');
    
    if (typeof openaiKey !== 'string' || !openaiKey.trim()) {
      throw new Error('llm.openai.apiKey deve ser uma string não vazia');
    }
    
    if (typeof openrouterKey !== 'string' || !openrouterKey.trim()) {
      throw new Error('llm.openrouter.apiKey deve ser uma string não vazia');
    }
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    
    current[keys[keys.length - 1]!] = value;
  }
}

// Re-export tipos para conveniência
export type { 
  ServerConfiguration, 
  LlmConfiguration, 
  RedisConfiguration 
} from './IConfigurationService';