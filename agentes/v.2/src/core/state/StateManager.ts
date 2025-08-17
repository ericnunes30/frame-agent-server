import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import type {
  IExecutionState,
  ExecutionContext,
  ExecutionContextData,
  IExecutionStateFactory,
  IExecutionStateListener
} from './IExecutionState';
import { ExecutionStateType } from './IExecutionState';
import type { ExecutionId } from '@core/orchestration/types/ExecutionId';

/**
 * Interface para repositório de estado.
 * Abstrai a persistência de estados de execução.
 */
export interface IStateRepository {
  save(executionId: ExecutionId, context: ExecutionContext): Promise<void>;
  load(executionId: ExecutionId): Promise<ExecutionContext | undefined>;
  delete(executionId: ExecutionId): Promise<boolean>;
  exists(executionId: ExecutionId): Promise<boolean>;
  list(): Promise<readonly ExecutionId[]>;
}

/**
 * Gerenciador central de estados de execução.
 * Coordena transições, persistência e notificações.
 * 
 * Responsabilidades:
 * - Gerenciar ciclo de vida das execuções
 * - Coordenar transições de estado
 * - Persistir estado via repository
 * - Notificar listeners sobre mudanças
 * 
 * @example
 * ```typescript
 * const stateManager = container.resolve(StateManager);
 * 
 * // Criar nova execução
 * const executionId = ExecutionId.generate();
 * await stateManager.createExecution(executionId);
 * 
 * // Transicionar estado
 * await stateManager.transitionTo(executionId, ExecutionStateType.RUNNING);
 * 
 * // Obter estado atual
 * const context = await stateManager.getExecutionContext(executionId);
 * ```
 */
@injectable()
export class StateManager {
  private readonly activeStates: Map<string, IExecutionState>;
  private readonly listeners: Set<IExecutionStateListener>;

  constructor(
    @inject('IStateRepository') private readonly repository: IStateRepository,
    @inject('IExecutionStateFactory') private readonly stateFactory: IExecutionStateFactory
  ) {
    this.activeStates = new Map();
    this.listeners = new Set();
  }

  /**
   * Cria nova execução no estado PENDING.
   */
  async createExecution(
    executionId: ExecutionId, 
    data?: Partial<ExecutionContextData>
  ): Promise<ExecutionContext> {
    if (await this.repository.exists(executionId)) {
      throw new Error(`Execução ${executionId.toString()} já existe`);
    }

    const context: ExecutionContext = {
      executionId,
      startedAt: new Date(),
      progress: 0,
      metadata: data?.metadata || {},
      errors: [],
      updatedAt: new Date()
    };

    const initialState = this.stateFactory.create(ExecutionStateType.PENDING, context);
    this.activeStates.set(executionId.toString(), initialState);

    await this.repository.save(executionId, context);
    
    return context;
  }

  /**
   * Transiciona execução para novo estado.
   */
  async transitionTo(
    executionId: ExecutionId, 
    newStateType: ExecutionStateType
  ): Promise<void> {
    const currentState = await this.getCurrentState(executionId);
    const context = await this.getExecutionContext(executionId);

    if (!currentState.canTransitionTo(newStateType)) {
      throw new Error(
        `Transição inválida de ${currentState.getType()} para ${newStateType} ` +
        `na execução ${executionId.toString()}`
      );
    }

    const previousStateType = currentState.getType();
    const newState = currentState.transitionTo(newStateType, context);
    
    this.activeStates.set(executionId.toString(), newState);
    
    context.updatedAt = new Date();
    await this.repository.save(executionId, context);

    // Notificar listeners
    await this.notifyStateChange(executionId, previousStateType, newStateType, context);
  }

  /**
   * Executa a lógica do estado atual.
   */
  async runCurrentState(executionId: ExecutionId): Promise<void> {
    const currentState = await this.getCurrentState(executionId);
    const context = await this.getExecutionContext(executionId);

    await currentState.run(context);
    
    context.updatedAt = new Date();
    await this.repository.save(executionId, context);
  }

  /**
   * Obtém o contexto de execução atual.
   */
  async getExecutionContext(executionId: ExecutionId): Promise<ExecutionContext> {
    const context = await this.repository.load(executionId);
    
    if (!context) {
      throw new Error(`Contexto de execução ${executionId.toString()} não encontrado`);
    }

    return context;
  }

  /**
   * Obtém o estado atual de uma execução.
   */
  async getCurrentState(executionId: ExecutionId): Promise<IExecutionState> {
    const executionIdStr = executionId.toString();
    let state = this.activeStates.get(executionIdStr);

    if (!state) {
      // Carregar do repositório se não estiver em memória
      const context = await this.getExecutionContext(executionId);
      const stateType = this.inferStateTypeFromContext(context);
      state = this.stateFactory.create(stateType, context);
      this.activeStates.set(executionIdStr, state);
    }

    return state;
  }

  /**
   * Adiciona listener para mudanças de estado.
   */
  addListener(listener: IExecutionStateListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener.
   */
  removeListener(listener: IExecutionStateListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Lista todas as execuções ativas.
   */
  async listActiveExecutions(): Promise<readonly ExecutionId[]> {
    return await this.repository.list();
  }

  /**
   * Remove execução do sistema.
   */
  async deleteExecution(executionId: ExecutionId): Promise<boolean> {
    this.activeStates.delete(executionId.toString());
    return await this.repository.delete(executionId);
  }

  private async notifyStateChange(
    executionId: ExecutionId,
    previousState: ExecutionStateType,
    newState: ExecutionStateType,
    context: ExecutionContext
  ): Promise<void> {
    const promises = Array.from(this.listeners).map(listener =>
      listener.onStateChange(executionId, previousState, newState, context)
        .catch(error => {
          console.error('Erro ao notificar listener de mudança de estado:', error);
        })
    );

    await Promise.allSettled(promises);
  }

  private inferStateTypeFromContext(context: ExecutionContext): ExecutionStateType {
    // Lógica simples para inferir estado baseado no contexto
    // Em implementação real, isso seria mais sofisticado
    if (context.errors.length > 0) {
      return ExecutionStateType.FAILED;
    }
    
    if (context.progress >= 100) {
      return ExecutionStateType.COMPLETED;
    }
    
    if (context.progress > 0) {
      return ExecutionStateType.RUNNING;
    }

    return ExecutionStateType.PENDING;
  }
}