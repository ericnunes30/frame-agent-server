import type { ExecutionId } from './ExecutionId';

/**
 * Enumeração dos tipos de prompt suportados pelo sistema.
 */
export enum PromptType {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
}

/**
 * Interface que define a estrutura de uma mensagem no prompt.
 */
export interface PromptMessage {
  readonly role: PromptType;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Interface que define a estrutura completa de um prompt.
 */
export interface PromptData {
  readonly id: string;
  readonly executionId: ExecutionId;
  readonly messages: readonly PromptMessage[];
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
}

/**
 * Tipo de domínio para representar prompts no sistema.
 * Elimina obsessão por tipos primitivos e encapsula validação.
 * Aplicação do padrão Value Object.
 * 
 * @example
 * ```typescript
 * const prompt = Prompt.create({
 *   executionId: ExecutionId.generate(),
 *   messages: [
 *     { role: PromptType.SYSTEM, content: 'Você é um assistente' },
 *     { role: PromptType.USER, content: 'Olá!' }
 *   ]
 * });
 * ```
 */
export class Prompt {
  private readonly data: PromptData;

  private constructor(data: PromptData) {
    this.validate(data);
    this.data = Object.freeze({
      ...data,
      messages: Object.freeze(data.messages.map(msg => Object.freeze(msg)))
    });
  }

  /**
   * Cria novo Prompt com validação
   */
  static create(params: Omit<PromptData, 'id' | 'createdAt'>): Prompt {
    const data: PromptData = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      ...params
    };
    return new Prompt(data);
  }

  /**
   * Reconstrói Prompt a partir de dados serializados
   */
  static fromData(data: PromptData): Prompt {
    return new Prompt({
      ...data,
      createdAt: new Date(data.createdAt)
    });
  }

  getId(): string {
    return this.data.id;
  }

  getExecutionId(): ExecutionId {
    return this.data.executionId;
  }

  getMessages(): readonly PromptMessage[] {
    return this.data.messages;
  }

  getModel(): string | undefined {
    return this.data.model;
  }

  getTemperature(): number | undefined {
    return this.data.temperature;
  }

  getMaxTokens(): number | undefined {
    return this.data.maxTokens;
  }

  getMetadata(): Record<string, unknown> | undefined {
    return this.data.metadata;
  }

  getCreatedAt(): Date {
    return this.data.createdAt;
  }

  /**
   * Adiciona nova mensagem ao prompt (retorna novo Prompt)
   */
  addMessage(message: PromptMessage): Prompt {
    const newData: PromptData = {
      ...this.data,
      messages: [...this.data.messages, message]
    };
    return new Prompt(newData);
  }

  /**
   * Retorna representação serializada do prompt
   */
  toData(): PromptData {
    return {
      ...this.data,
      messages: this.data.messages.map(msg => ({ ...msg }))
    };
  }

  private validate(data: PromptData): void {
    if (!data.messages || data.messages.length === 0) {
      throw new Error('Prompt deve conter pelo menos uma mensagem');
    }

    data.messages.forEach((message, index) => {
      if (!message.content?.trim()) {
        throw new Error(`Mensagem ${index} deve ter conteúdo válido`);
      }

      if (!Object.values(PromptType).includes(message.role)) {
        throw new Error(`Role inválido na mensagem ${index}: ${message.role}`);
      }
    });

    if (data.temperature !== undefined && (data.temperature < 0 || data.temperature > 2)) {
      throw new Error('Temperature deve estar entre 0 e 2');
    }

    if (data.maxTokens !== undefined && data.maxTokens <= 0) {
      throw new Error('MaxTokens deve ser positivo');
    }
  }
}