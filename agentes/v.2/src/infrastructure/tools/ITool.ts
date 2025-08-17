import type { ToolResult } from './ToolResult';

/**
 * Interface Strategy para ferramentas do sistema.
 * Define o contrato que todas as ferramentas devem implementar,
 * permitindo intercambiabilidade e polimorfismo.
 * 
 * Aplicação do padrão Strategy Pattern - cada ferramenta é uma estratégia
 * específica para executar uma função, mas todas seguem o mesmo contrato.
 * 
 * @example
 * ```typescript
 * class WebSearchTool implements ITool {
 *   getName(): string {
 *     return 'web_search';
 *   }
 * 
 *   getDescription(): string {
 *     return 'Busca informações na web';
 *   }
 * 
 *   getParameterSchema(): ToolParameterSchema {
 *     return {
 *       type: 'object',
 *       properties: {
 *         query: { type: 'string', description: 'Termo de busca' }
 *       },
 *       required: ['query']
 *     };
 *   }
 * 
 *   async execute(args: Record<string, unknown>): Promise<ToolResult> {
 *     // Implementação da busca
 *   }
 * }
 * ```
 */
export interface ITool {
  /**
   * Nome único da ferramenta.
   * Usado para identificação e registro.
   */
  getName(): string;

  /**
   * Descrição legível da funcionalidade da ferramenta.
   * Usado para documentação e seleção automática.
   */
  getDescription(): string;

  /**
   * Schema de validação dos parâmetros de entrada.
   * Define estrutura e tipos esperados.
   */
  getParameterSchema(): ToolParameterSchema;

  /**
   * Executa a funcionalidade da ferramenta.
   * 
   * @param args - Parâmetros de entrada validados
   * @returns Promise com resultado estruturado
   */
  execute(args: Record<string, unknown>): Promise<ToolResult>;

  /**
   * Versão da ferramenta.
   * Usado para compatibilidade e debugging.
   */
  getVersion(): string;

  /**
   * Indica se a ferramenta está disponível para uso.
   * Permite desabilitar ferramentas temporariamente.
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Schema de parâmetros baseado em JSON Schema.
 * Define estrutura de validação para parâmetros de entrada.
 */
export interface ToolParameterSchema {
  readonly type: 'object';
  readonly properties: Record<string, ToolParameterProperty>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

/**
 * Propriedade individual do schema de parâmetros.
 */
export interface ToolParameterProperty {
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description: string;
  readonly enum?: readonly (string | number)[];
  readonly items?: ToolParameterProperty;
  readonly properties?: Record<string, ToolParameterProperty>;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly default?: unknown;
}

/**
 * Metadados de uma ferramenta.
 * Informações adicionais para categorização e descoberta.
 */
export interface ToolMetadata {
  readonly category: string;
  readonly tags: readonly string[];
  readonly author?: string;
  readonly license?: string;
  readonly homepage?: string;
  readonly deprecated?: boolean;
  readonly experimental?: boolean;
}

/**
 * Interface estendida para ferramentas com metadados.
 * Opcional para ferramentas que querem fornecer informações extras.
 */
export interface IToolWithMetadata extends ITool {
  getMetadata(): ToolMetadata;
}