import 'reflect-metadata';
import { injectable } from 'tsyringe';
import type { ITool, ToolParameterSchema } from '../ITool';
import type { ToolResult } from '../ToolResult';
import { z } from 'zod';

/**
 * Interface para validação de parâmetros de ferramentas.
 */
export interface IToolValidator {
  validate(schema: ToolParameterSchema, args: Record<string, unknown>): void;
}

/**
 * Registry central para todas as ferramentas disponíveis no sistema.
 * Permite registro, descoberta e execução de ferramentas de forma uniforme.
 * 
 * Responsabilidades:
 * - Registrar e descobrir ferramentas
 * - Validar parâmetros antes da execução
 * - Fornecer interface uniforme para acesso às ferramentas
 * - Suportar ferramentas nativas e adaptadores externos
 * 
 * @example
 * ```typescript
 * const registry = container.resolve(ToolRegistry);
 * 
 * // Registrar ferramenta
 * registry.register(new WebSearchTool());
 * 
 * // Executar ferramenta
 * const result = await registry.execute('web_search', {
 *   query: 'typescript patterns'
 * });
 * ```
 */
@injectable()
export class ToolRegistry {
  private readonly tools: Map<string, ITool>;
  private readonly validator: IToolValidator;

  constructor() {
    this.tools = new Map();
    this.validator = new ZodToolValidator();
  }

  /**
   * Registra uma nova ferramenta no registry.
   * Verifica duplicatas e valida a ferramenta.
   */
  register(tool: ITool): void {
    const name = tool.getName();
    
    if (this.tools.has(name)) {
      throw new Error(`Ferramenta '${name}' já está registrada`);
    }

    this.validateTool(tool);
    this.tools.set(name, tool);
  }

  /**
   * Remove uma ferramenta do registry.
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Obtém uma ferramenta pelo nome.
   */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Lista todas as ferramentas registradas.
   */
  list(): readonly ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Lista nomes de todas as ferramentas disponíveis.
   */
  listNames(): readonly string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Executa uma ferramenta com validação de parâmetros.
   */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      throw new Error(`Ferramenta '${name}' não encontrada`);
    }

    // Verificar disponibilidade
    const isAvailable = await tool.isAvailable();
    if (!isAvailable) {
      throw new Error(`Ferramenta '${name}' não está disponível`);
    }

    // Validar parâmetros
    try {
      this.validator.validate(tool.getParameterSchema(), args);
    } catch (error) {
      throw new Error(
        `Parâmetros inválidos para ferramenta '${name}': ${error instanceof Error ? error.message : 'Erro de validação'}`
      );
    }

    // Executar ferramenta
    return await tool.execute(args);
  }

  /**
   * Verifica se uma ferramenta está registrada.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Obtém informações de uma ferramenta sem executá-la.
   */
  getToolInfo(name: string): ToolInfo | undefined {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return undefined;
    }

    return {
      name: tool.getName(),
      description: tool.getDescription(),
      version: tool.getVersion(),
      parameterSchema: tool.getParameterSchema()
    };
  }

  /**
   * Lista informações de todas as ferramentas.
   */
  listToolsInfo(): readonly ToolInfo[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.getName(),
      description: tool.getDescription(),
      version: tool.getVersion(),
      parameterSchema: tool.getParameterSchema()
    }));
  }

  private validateTool(tool: ITool): void {
    const name = tool.getName();
    
    if (!name?.trim()) {
      throw new Error('Nome da ferramenta é obrigatório');
    }

    if (!tool.getDescription()?.trim()) {
      throw new Error(`Descrição da ferramenta '${name}' é obrigatória`);
    }

    if (!tool.getVersion()?.trim()) {
      throw new Error(`Versão da ferramenta '${name}' é obrigatória`);
    }

    const schema = tool.getParameterSchema();
    if (!schema || schema.type !== 'object') {
      throw new Error(`Schema de parâmetros da ferramenta '${name}' deve ser do tipo 'object'`);
    }
  }
}

/**
 * Implementação de validador usando Zod.
 */
class ZodToolValidator implements IToolValidator {
  validate(schema: ToolParameterSchema, args: Record<string, unknown>): void {
    const zodSchema = this.convertToZodSchema(schema);
    zodSchema.parse(args);
  }

  private convertToZodSchema(schema: ToolParameterSchema): z.ZodObject<any> {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, prop] of Object.entries(schema.properties)) {
      let zodType = this.convertPropertyToZod(prop);
      
      if (!schema.required?.includes(key)) {
        zodType = zodType.optional();
      }
      
      shape[key] = zodType;
    }

    return z.object(shape);
  }

  private convertPropertyToZod(prop: any): z.ZodTypeAny {
    switch (prop.type) {
      case 'string':
        let stringSchema = z.string();
        if (prop.minLength) stringSchema = stringSchema.min(prop.minLength);
        if (prop.maxLength) stringSchema = stringSchema.max(prop.maxLength);
        if (prop.pattern) stringSchema = stringSchema.regex(new RegExp(prop.pattern));
        if (prop.enum) return z.enum(prop.enum as [string, ...string[]]);
        return stringSchema;
        
      case 'number':
        let numberSchema = z.number();
        if (prop.minimum) numberSchema = numberSchema.min(prop.minimum);
        if (prop.maximum) numberSchema = numberSchema.max(prop.maximum);
        return numberSchema;
        
      case 'boolean':
        return z.boolean();
        
      case 'array':
        const itemSchema = prop.items ? this.convertPropertyToZod(prop.items) : z.unknown();
        return z.array(itemSchema);
        
      case 'object':
        if (prop.properties) {
          const objShape: Record<string, z.ZodTypeAny> = {};
          for (const [key, value] of Object.entries(prop.properties)) {
            objShape[key] = this.convertPropertyToZod(value);
          }
          return z.object(objShape);
        }
        return z.record(z.unknown());
        
      default:
        return z.unknown();
    }
  }
}

/**
 * Informações básicas de uma ferramenta.
 */
export interface ToolInfo {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly parameterSchema: ToolParameterSchema;
}