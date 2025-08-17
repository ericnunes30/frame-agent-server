/**
 * Enumeração dos possíveis status de resultado de uma tarefa.
 * Permite ao orquestrador tomar decisões informadas baseadas no resultado.
 */
export enum TaskResultStatus {
  SUCCESS = 'success',
  FAILURE_RECOVERABLE = 'failure_recoverable',
  FAILURE_TERMINAL = 'failure_terminal',
  SUCCESS_WITH_EMPTY_RESULT = 'success_with_empty_result'
}

/**
 * Interface que define a estrutura do resultado de uma tarefa.
 * Contém informações ricas para suporte à orquestração inteligente.
 */
export interface TaskResultData {
  readonly status: TaskResultStatus;
  readonly payload: unknown;
  readonly metadata: {
    readonly executionTimeMs: number;
    readonly agentType: string;
    readonly taskId: string;
    readonly timestamp: Date;
    readonly errorMessage?: string;
    readonly retryCount?: number;
    readonly context?: Record<string, unknown>;
  };
}

/**
 * Tipo de domínio para resultado de execução de tarefas.
 * Encapsula o retorno de agentes com informações estruturadas
 * para depuração e orquestração inteligente.
 * 
 * @example
 * ```typescript
 * const result = TaskResult.success({
 *   payload: { data: 'resultado' },
 *   executionTimeMs: 1500,
 *   agentType: 'ResearcherAgent',
 *   taskId: 'task-123'
 * });
 * 
 * const failure = TaskResult.failure({
 *   errorMessage: 'Falha na API',
 *   executionTimeMs: 500,
 *   agentType: 'ResearcherAgent', 
 *   taskId: 'task-123',
 *   recoverable: true
 * });
 * ```
 */
export class TaskResult {
  private readonly data: TaskResultData;

  private constructor(data: TaskResultData) {
    this.validate(data);
    this.data = Object.freeze(data);
  }

  /**
   * Cria resultado de sucesso
   */
  static success(params: {
    payload: unknown;
    executionTimeMs: number;
    agentType: string;
    taskId: string;
    context?: Record<string, unknown>;
  }): TaskResult {
    const data: TaskResultData = {
      status: params.payload ? TaskResultStatus.SUCCESS : TaskResultStatus.SUCCESS_WITH_EMPTY_RESULT,
      payload: params.payload,
      metadata: {
        executionTimeMs: params.executionTimeMs,
        agentType: params.agentType,
        taskId: params.taskId,
        timestamp: new Date(),
        ...(params.context && { context: params.context })
      }
    };
    return new TaskResult(data);
  }

  /**
   * Cria resultado de falha
   */
  static failure(params: {
    errorMessage: string;
    executionTimeMs: number;
    agentType: string;
    taskId: string;
    recoverable: boolean;
    retryCount?: number;
    context?: Record<string, unknown>;
  }): TaskResult {
    const data: TaskResultData = {
      status: params.recoverable ? TaskResultStatus.FAILURE_RECOVERABLE : TaskResultStatus.FAILURE_TERMINAL,
      payload: null,
      metadata: {
        executionTimeMs: params.executionTimeMs,
        agentType: params.agentType,
        taskId: params.taskId,
        timestamp: new Date(),
        errorMessage: params.errorMessage,
        ...(params.retryCount !== undefined && { retryCount: params.retryCount }),
        ...(params.context && { context: params.context })
      }
    };
    return new TaskResult(data);
  }

  /**
   * Reconstrói TaskResult a partir de dados serializados
   */
  static fromData(data: TaskResultData): TaskResult {
    return new TaskResult({
      ...data,
      metadata: {
        ...data.metadata,
        timestamp: new Date(data.metadata.timestamp)
      }
    });
  }

  getStatus(): TaskResultStatus {
    return this.data.status;
  }

  getPayload<T = unknown>(): T {
    return this.data.payload as T;
  }

  getExecutionTimeMs(): number {
    return this.data.metadata.executionTimeMs;
  }

  getAgentType(): string {
    return this.data.metadata.agentType;
  }

  getTaskId(): string {
    return this.data.metadata.taskId;
  }

  getTimestamp(): Date {
    return this.data.metadata.timestamp;
  }

  getErrorMessage(): string | undefined {
    return this.data.metadata.errorMessage;
  }

  getRetryCount(): number | undefined {
    return this.data.metadata.retryCount;
  }

  getContext(): Record<string, unknown> | undefined {
    return this.data.metadata.context;
  }

  /**
   * Verifica se o resultado representa sucesso
   */
  isSuccess(): boolean {
    return this.data.status === TaskResultStatus.SUCCESS || 
           this.data.status === TaskResultStatus.SUCCESS_WITH_EMPTY_RESULT;
  }

  /**
   * Verifica se a falha é recuperável
   */
  isRecoverable(): boolean {
    return this.data.status === TaskResultStatus.FAILURE_RECOVERABLE;
  }

  /**
   * Retorna representação serializada
   */
  toData(): TaskResultData {
    return { ...this.data };
  }

  private validate(data: TaskResultData): void {
    if (!Object.values(TaskResultStatus).includes(data.status)) {
      throw new Error(`TaskResult status inválido: ${data.status}`);
    }

    if (!data.metadata.agentType?.trim()) {
      throw new Error('TaskResult agentType é obrigatório');
    }

    if (!data.metadata.taskId?.trim()) {
      throw new Error('TaskResult taskId é obrigatório');
    }

    if (data.metadata.executionTimeMs < 0) {
      throw new Error('TaskResult executionTimeMs deve ser positivo');
    }
  }
}