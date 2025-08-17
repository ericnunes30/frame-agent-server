import { v4 as uuidv4 } from 'uuid';

/**
 * Tipo de domínio para identificar execuções de forma única.
 * Elimina a obsessão por tipos primitivos (string) e encapsula
 * a lógica de geração e validação de IDs de execução.
 * 
 * @example
 * ```typescript
 * const id = ExecutionId.generate();
 * const fromString = ExecutionId.from('existing-uuid');
 * ```
 */
export class ExecutionId {
  private readonly value: string;

  private constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  /**
   * Gera um novo ExecutionId único
   */
  static generate(): ExecutionId {
    return new ExecutionId(uuidv4());
  }

  /**
   * Cria ExecutionId a partir de string existente
   */
  static from(value: string): ExecutionId {
    return new ExecutionId(value);
  }

  /**
   * Retorna o valor string do ID
   */
  toString(): string {
    return this.value;
  }

  /**
   * Compara dois ExecutionIds
   */
  equals(other: ExecutionId): boolean {
    return this.value === other.value;
  }

  private validate(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!value || typeof value !== 'string') {
      throw new Error('ExecutionId deve ser uma string válida');
    }
    
    if (!uuidRegex.test(value)) {
      throw new Error('ExecutionId deve ser um UUID v4 válido');
    }
  }
}