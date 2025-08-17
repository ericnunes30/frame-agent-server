/**
 * Enumeração dos possíveis status de resultado de execução de ferramentas.
 */
export enum ToolResultStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

/**
 * Interface que define a estrutura do resultado de execução de uma ferramenta.
 */
export interface ToolResultData {
  readonly status: ToolResultStatus;
  readonly output: unknown;
  readonly error?: string;
  readonly metadata: {
    readonly toolName: string;
    readonly executionTimeMs: number;
    readonly timestamp: Date;
    readonly inputParameters: Record<string, unknown>;
    readonly version?: string;
    readonly context?: Record<string, unknown>;
  };
}

/**
 * Tipo de domínio para resultado de execução de ferramentas.
 * Encapsula o retorno de ferramentas com informações estruturadas
 * para depuração e análise de performance.
 * 
 * @example
 * ```typescript
 * const result = ToolResult.success({
 *   output: { data: 'resultado da busca' },
 *   toolName: 'WebSearchTool',
 *   executionTimeMs: 800,
 *   inputParameters: { query: 'typescript' }
 * });
 * 
 * const error = ToolResult.error({
 *   error: 'API timeout',
 *   toolName: 'WebSearchTool',
 *   executionTimeMs: 5000,
 *   inputParameters: { query: 'typescript' }
 * });
 * ```
 */
export class ToolResult {
  private readonly data: ToolResultData;

  private constructor(data: ToolResultData) {
    this.validate(data);
    this.data = Object.freeze(data);
  }

  /**
   * Cria resultado de sucesso
   */
  static success(params: {
    output: unknown;
    toolName: string;
    executionTimeMs: number;
    inputParameters: Record<string, unknown>;
    version?: string;
    context?: Record<string, unknown>;
  }): ToolResult {
    const data: ToolResultData = {
      status: ToolResultStatus.SUCCESS,
      output: params.output,
      metadata: {
        toolName: params.toolName,
        executionTimeMs: params.executionTimeMs,
        timestamp: new Date(),
        inputParameters: params.inputParameters,
        ...(params.version && { version: params.version }),
        ...(params.context && { context: params.context })
      }
    };
    return new ToolResult(data);
  }

  /**
   * Cria resultado de erro
   */
  static error(params: {
    error: string;
    toolName: string;
    executionTimeMs: number;
    inputParameters: Record<string, unknown>;
    version?: string;
    context?: Record<string, unknown>;
  }): ToolResult {
    const data: ToolResultData = {
      status: ToolResultStatus.ERROR,
      output: null,
      error: params.error,
      metadata: {
        toolName: params.toolName,
        executionTimeMs: params.executionTimeMs,
        timestamp: new Date(),
        inputParameters: params.inputParameters,
        ...(params.version && { version: params.version }),
        ...(params.context && { context: params.context })
      }
    };
    return new ToolResult(data);
  }

  /**
   * Cria resultado de timeout
   */
  static timeout(params: {
    toolName: string;
    executionTimeMs: number;
    inputParameters: Record<string, unknown>;
    version?: string;
    context?: Record<string, unknown>;
  }): ToolResult {
    const data: ToolResultData = {
      status: ToolResultStatus.TIMEOUT,
      output: null,
      error: 'Tool execution timeout',
      metadata: {
        toolName: params.toolName,
        executionTimeMs: params.executionTimeMs,
        timestamp: new Date(),
        inputParameters: params.inputParameters,
        ...(params.version && { version: params.version }),
        ...(params.context && { context: params.context })
      }
    };
    return new ToolResult(data);
  }

  /**
   * Reconstrói ToolResult a partir de dados serializados
   */
  static fromData(data: ToolResultData): ToolResult {
    return new ToolResult({
      ...data,
      metadata: {
        ...data.metadata,
        timestamp: new Date(data.metadata.timestamp)
      }
    });
  }

  getStatus(): ToolResultStatus {
    return this.data.status;
  }

  getOutput<T = unknown>(): T {
    return this.data.output as T;
  }

  getError(): string | undefined {
    return this.data.error;
  }

  getToolName(): string {
    return this.data.metadata.toolName;
  }

  getExecutionTimeMs(): number {
    return this.data.metadata.executionTimeMs;
  }

  getTimestamp(): Date {
    return this.data.metadata.timestamp;
  }

  getInputParameters(): Record<string, unknown> {
    return this.data.metadata.inputParameters;
  }

  getVersion(): string | undefined {
    return this.data.metadata.version;
  }

  getContext(): Record<string, unknown> | undefined {
    return this.data.metadata.context;
  }

  /**
   * Verifica se a execução foi bem-sucedida
   */
  isSuccess(): boolean {
    return this.data.status === ToolResultStatus.SUCCESS;
  }

  /**
   * Verifica se houve erro
   */
  isError(): boolean {
    return this.data.status === ToolResultStatus.ERROR;
  }

  /**
   * Verifica se houve timeout
   */
  isTimeout(): boolean {
    return this.data.status === ToolResultStatus.TIMEOUT;
  }

  /**
   * Retorna representação serializada
   */
  toData(): ToolResultData {
    return { ...this.data };
  }

  private validate(data: ToolResultData): void {
    if (!Object.values(ToolResultStatus).includes(data.status)) {
      throw new Error(`ToolResult status inválido: ${data.status}`);
    }

    if (!data.metadata.toolName?.trim()) {
      throw new Error('ToolResult toolName é obrigatório');
    }

    if (data.metadata.executionTimeMs < 0) {
      throw new Error('ToolResult executionTimeMs deve ser positivo');
    }

    if (!data.metadata.inputParameters) {
      throw new Error('ToolResult inputParameters é obrigatório');
    }
  }
}