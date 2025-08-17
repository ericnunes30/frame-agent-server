import type { Prompt } from '@core/orchestration/types/Prompt';

/**
 * Interface Adapter para comunicação com APIs de LLM.
 * Abstrai os detalhes específicos de cada provedor, permitindo
 * intercambiabilidade entre diferentes APIs (OpenAI, OpenRouter, etc.).
 * 
 * Aplicação do padrão Adapter Pattern - cada implementação adapta
 * uma API específica para nossa interface comum.
 * 
 * @example
 * ```typescript
 * class OpenAIAdapter implements ILlmApi {\
 *   async generate(prompt: Prompt): Promise<LlmResponse> {
 *     // Implementação específica para OpenAI
 *   }
 * 
 *   getProviderName(): string {
 *     return 'openai';
 *   }
 * 
 *   isAvailable(): Promise<boolean> {
 *     // Verificar conectividade
 *   }
 * }
 * ```
 */
export interface ILlmApi {
  /**
   * Gera resposta baseada no prompt fornecido.
   * 
   * @param prompt - Prompt estruturado com mensagens e configurações
   * @returns Promise com resposta estruturada do LLM
   */
  generate(prompt: Prompt): Promise<LlmResponse>;

  /**
   * Nome do provedor (ex: 'openai', 'openrouter', 'anthropic').
   * Usado para identificação e seleção.
   */
  getProviderName(): string;

  /**
   * Modelos suportados por este adapter.
   */
  getSupportedModels(): readonly string[];

  /**
   * Verifica se o adapter está disponível para uso.
   * Pode incluir verificação de conectividade, chaves de API, etc.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Configurações específicas do provedor.
   */
  getConfiguration(): LlmAdapterConfiguration;

  /**
   * Valida um prompt antes do envio.
   * Permite verificações específicas do provedor.
   */
  validatePrompt(prompt: Prompt): Promise<PromptValidationResult>;
}

/**
 * Resposta estruturada de um LLM.
 * Padroniza o formato independente do provedor.
 */
export interface LlmResponse {
  readonly content: string;
  readonly model: string;
  readonly provider: string;
  readonly usage: LlmUsage;
  readonly metadata: LlmResponseMetadata;
  readonly finishReason: LlmFinishReason;
}

/**
 * Informações de uso/consumo da requisição.
 */
export interface LlmUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCost?: number;
}

/**
 * Metadados da resposta do LLM.
 */
export interface LlmResponseMetadata {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly latencyMs: number;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly customData?: Record<string, unknown>;
}

/**
 * Razão de finalização da geração.
 */
export enum LlmFinishReason {
  STOP = 'stop',
  LENGTH = 'length',
  CONTENT_FILTER = 'content_filter',
  TOOL_CALLS = 'tool_calls',
  ERROR = 'error'
}

/**
 * Configuração de um adapter LLM.
 */
export interface LlmAdapterConfiguration {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly defaultModel: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly rateLimit?: {
    readonly requestsPerMinute: number;
    readonly tokensPerMinute: number;
  };
  readonly customHeaders?: Record<string, string>;
}

/**
 * Resultado da validação de um prompt.
 */
export interface PromptValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly estimatedTokens?: number;
  readonly estimatedCost?: number;
}

/**
 * Dados para criação de um adapter LLM.
 */
export interface LlmAdapterCreationData {
  readonly provider: string;
  readonly configuration: LlmAdapterConfiguration;
  readonly supportedModels: readonly string[];
}

/**
 * Erro específico de LLM com informações estruturadas.
 */
export class LlmError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly errorCode?: string,
    public readonly httpStatus?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

/**
 * Erro de rate limit específico.
 */
export class LlmRateLimitError extends LlmError {
  constructor(
    provider: string,
    public readonly retryAfterMs: number
  ) {
    super(`Rate limit exceeded for provider ${provider}`, provider, 'RATE_LIMIT', 429, true);
    this.name = 'LlmRateLimitError';
  }
}