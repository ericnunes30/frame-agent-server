import type { ExecutionId } from './ExecutionId';

/**
 * Enumeração dos tipos de tarefa possíveis no sistema.
 * Cada tipo define uma categoria específica de processamento.
 */
export enum TaskType {
  PLANNING = 'planning',
  RESEARCH = 'research',
  WRITING = 'writing',
  ANALYSIS = 'analysis',
  VALIDATION = 'validation'
}

/**
 * Enumeração dos níveis de prioridade das tarefas.
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Interface que define a estrutura de uma tarefa no sistema.
 * Encapsula todas as informações necessárias para execução.
 */
export interface TaskData {
  readonly id: string;
  readonly type: TaskType;
  readonly description: string;
  readonly instructions: string;
  readonly priority: TaskPriority;
  readonly executionId: ExecutionId;
  readonly context?: Record<string, unknown>;
  readonly dependencies?: string[];
  readonly timeout?: number;
}

/**
 * Tipo de domínio para representar uma tarefa no sistema.
 * Elimina obsessão por tipos primitivos e encapsula validação.
 * Aplicação do padrão Value Object.
 * 
 * @example
 * ```typescript
 * const task = Task.create({
 *   type: TaskType.RESEARCH,
 *   description: 'Pesquisar sobre IA',
 *   instructions: 'Buscar informações atualizadas',
 *   priority: TaskPriority.HIGH,
 *   executionId: ExecutionId.generate()
 * });
 * ```
 */
export class Task {
  private readonly data: TaskData;

  private constructor(data: TaskData) {
    this.validate(data);
    this.data = Object.freeze(data);
  }

  /**
   * Cria nova instância de Task com validação
   */
  static create(params: Omit<TaskData, 'id'>): Task {
    const data: TaskData = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...params
    };
    return new Task(data);
  }

  /**
   * Reconstrói Task a partir de dados serializados
   */
  static fromData(data: TaskData): Task {
    return new Task(data);
  }

  getId(): string {
    return this.data.id;
  }

  getType(): TaskType {
    return this.data.type;
  }

  getDescription(): string {
    return this.data.description;
  }

  getInstructions(): string {
    return this.data.instructions;
  }

  getPriority(): TaskPriority {
    return this.data.priority;
  }

  getExecutionId(): ExecutionId {
    return this.data.executionId;
  }

  getContext(): Record<string, unknown> | undefined {
    return this.data.context;
  }

  getDependencies(): string[] | undefined {
    return this.data.dependencies;
  }

  getTimeout(): number | undefined {
    return this.data.timeout;
  }

  /**
   * Retorna representação serializada da tarefa
   */
  toData(): TaskData {
    return { ...this.data };
  }

  private validate(data: TaskData): void {
    if (!data.description?.trim()) {
      throw new Error('Task description é obrigatória');
    }

    if (!data.instructions?.trim()) {
      throw new Error('Task instructions são obrigatórias');
    }

    if (!Object.values(TaskType).includes(data.type)) {
      throw new Error(`Task type inválido: ${data.type}`);
    }

    if (!Object.values(TaskPriority).includes(data.priority)) {
      throw new Error(`Task priority inválida: ${data.priority}`);
    }

    if (data.timeout && data.timeout <= 0) {
      throw new Error('Task timeout deve ser positivo');
    }
  }
}