import type { ExecutionId } from '@core/orchestration/types/ExecutionId';

/**
 * Interface State para gerenciamento do ciclo de vida das execuções.
 * Define o contrato que todos os estados devem implementar,
 * permitindo transições controladas e comportamentos específicos.
 * 
 * Aplicação do padrão State Pattern - cada estado encapsula
 * comportamentos específicos e transições válidas.
 * 
 * @example
 * ```typescript
 * class RunningState implements IExecutionState {\
 *   async run(context: ExecutionContext): Promise<void> {
 *     // Executar lógica do estado
 *   }\
 * 
 *   canTransitionTo(newState: ExecutionStateType): boolean {
 *     return [ExecutionStateType.COMPLETED, ExecutionStateType.FAILED].includes(newState);
 *   }\
 * }\
 * ```
 */
export interface IExecutionState {
  /**
   * Executa a lógica específica deste estado.
   * 
   * @param context - Contexto da execução
   */
  run(context: ExecutionContext): Promise<void>;

  /**
   * Verifica se é possível transicionar para um novo estado.
   * 
   * @param newState - Estado de destino
   * @returns true se a transição é válida
   */
  canTransitionTo(newState: ExecutionStateType): boolean;

  /**
   * Realiza transição para um novo estado.
   * 
   * @param newState - Estado de destino
   * @param context - Contexto da execução
   * @returns Nova instância do estado
   */
  transitionTo(newState: ExecutionStateType, context: ExecutionContext): IExecutionState;

  /**
   * Retorna o tipo deste estado.
   */
  getType(): ExecutionStateType;

  /**
   * Indica se este estado é final (não permite mais transições).
   */
  isFinal(): boolean;

  /**
   * Retorna metadata específica do estado.
   */
  getMetadata(): ExecutionStateMetadata;
}

/**
 * Enumeração dos tipos de estado possíveis.
 */
export enum ExecutionStateType {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

/**
 * Contexto de execução compartilhado entre estados.
 * Contém informações necessárias para operações de estado.
 */
export interface ExecutionContext {
  readonly executionId: ExecutionId;
  readonly startedAt: Date;
  readonly currentTask?: string;
  readonly progress: number;
  readonly metadata: Record<string, unknown>;
  readonly errors: readonly ExecutionError[];
  updatedAt: Date;
}

/**
 * Metadata específica de um estado.
 */
export interface ExecutionStateMetadata {
  readonly enteredAt: Date;
  readonly duration?: number;
  readonly attempts?: number;
  readonly lastError?: string;
  readonly customData?: Record<string, unknown>;
}

/**
 * Erro estruturado de execução.
 */
export interface ExecutionError {
  readonly message: string;
  readonly code?: string;
  readonly stack?: string;
  readonly timestamp: Date;
  readonly recoverable: boolean;
  readonly context?: Record<string, unknown>;
}

/**
 * Dados para criação de contexto de execução.
 */
export interface ExecutionContextData {
  readonly executionId: ExecutionId;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Factory para criação de estados.
 * Elimina condicionais na criação de estados.
 */
export interface IExecutionStateFactory {
  create(type: ExecutionStateType, context: ExecutionContext): IExecutionState;
  getAvailableTypes(): readonly ExecutionStateType[];
}

/**
 * Listener para mudanças de estado.
 * Permite observar transições para logging, notificações, etc.
 */
export interface IExecutionStateListener {
  onStateChange(
    executionId: ExecutionId,
    previousState: ExecutionStateType,
    newState: ExecutionStateType,
    context: ExecutionContext
  ): Promise<void>;
}