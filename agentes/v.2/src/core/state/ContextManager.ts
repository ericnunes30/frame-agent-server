import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ExecutionId } from '@core/orchestration/types/ExecutionId';
import type { Task } from '@core/orchestration/types/Task';
import type { TaskResult } from '@core/orchestration/types/TaskResult';

/**
 * Interface para repositório de memória estratégica.
 * Abstrai a persistência de contexto de longo prazo.
 */
export interface IMemoryRepository {
  save(executionId: ExecutionId, memory: StrategicMemory): Promise<void>;
  load(executionId: ExecutionId): Promise<StrategicMemory | undefined>;
  delete(executionId: ExecutionId): Promise<boolean>;
  exists(executionId: ExecutionId): Promise<boolean>;
}

/**
 * Memória estratégica de longo prazo.
 * Contém resumo consolidado do fluxo de trabalho.
 */
export interface StrategicMemory {
  readonly executionId: ExecutionId;
  readonly summary: string;
  readonly completedTasks: readonly CompletedTaskSummary[];
  readonly currentContext: Record<string, unknown>;
  readonly learnings: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Resumo de tarefa concluída para memória estratégica.
 */
export interface CompletedTaskSummary {
  readonly taskId: string;
  readonly type: string;
  readonly description: string;
  readonly outcome: string;
  readonly keyFindings: readonly string[];
  readonly completedAt: Date;
}

/**
 * Contexto tático de curto prazo.
 * Existe apenas durante execução de uma tarefa.
 */
export interface TacticalMemory {
  readonly taskId: string;
  readonly thoughts: readonly string[];
  readonly toolCalls: readonly ToolCallRecord[];
  readonly intermediateResults: readonly unknown[];
  readonly startedAt: Date;
}

/**
 * Registro de chamada de ferramenta.
 */
export interface ToolCallRecord {
  readonly toolName: string;
  readonly input: Record<string, unknown>;
  readonly output: unknown;
  readonly timestamp: Date;
  readonly success: boolean;
}

/**
 * Gerenciador de contexto e memória estratégica.
 * Coordena memória de longo prazo (estratégica) e curto prazo (tática).
 * 
 * Responsabilidades:
 * - Gerenciar memória estratégica persistente
 * - Fornecer contexto relevante para agentes
 * - Consolidar resultados de tarefas
 * - Manter learnings entre execuções
 * 
 * @example
 * ```typescript
 * const contextManager = container.resolve(ContextManager);
 * 
 * // Inicializar contexto
 * await contextManager.initializeContext(executionId);
 * 
 * // Obter contexto para tarefa
 * const context = await contextManager.getContextForTask(task);
 * 
 * // Atualizar com resultado
 * await contextManager.updateWithTaskResult(taskResult);
 * ```
 */
@injectable()
export class ContextManager {
  private readonly tacticalMemory: Map<string, TacticalMemory>;

  constructor(
    @inject('IMemoryRepository') private readonly memoryRepository: IMemoryRepository
  ) {
    this.tacticalMemory = new Map();
  }

  /**
   * Inicializa contexto estratégico para nova execução.
   */
  async initializeContext(executionId: ExecutionId, initialContext?: Record<string, unknown>): Promise<StrategicMemory> {
    const existingMemory = await this.memoryRepository.load(executionId);
    
    if (existingMemory) {
      return existingMemory;
    }

    const newMemory: StrategicMemory = {
      executionId,
      summary: 'Execução iniciada',
      completedTasks: [],
      currentContext: initialContext || {},
      learnings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.memoryRepository.save(executionId, newMemory);
    return newMemory;
  }

  /**
   * Obtém contexto relevante para execução de tarefa.
   */
  async getContextForTask(task: Task): Promise<TaskExecutionContext> {
    const executionId = task.getExecutionId();
    const strategicMemory = await this.memoryRepository.load(executionId);

    if (!strategicMemory) {
      throw new Error(`Memória estratégica não encontrada para execução ${executionId.toString()}`);
    }

    return {
      executionId,
      strategicSummary: strategicMemory.summary,
      relevantHistory: this.extractRelevantHistory(strategicMemory, task),
      currentContext: strategicMemory.currentContext,
      previousLearnings: strategicMemory.learnings,
      taskContext: task.getContext() || {}
    };
  }

  /**
   * Inicia memória tática para uma tarefa.
   */
  startTacticalMemory(taskId: string): void {
    const tacticalMemory: TacticalMemory = {
      taskId,
      thoughts: [],
      toolCalls: [],
      intermediateResults: [],
      startedAt: new Date()
    };

    this.tacticalMemory.set(taskId, tacticalMemory);
  }

  /**
   * Adiciona pensamento à memória tática.
   */
  addThought(taskId: string, thought: string): void {
    const memory = this.tacticalMemory.get(taskId);
    if (!memory) return;

    const updatedMemory: TacticalMemory = {
      ...memory,
      thoughts: [...memory.thoughts, thought]
    };

    this.tacticalMemory.set(taskId, updatedMemory);
  }

  /**
   * Registra chamada de ferramenta na memória tática.
   */
  recordToolCall(taskId: string, toolCall: ToolCallRecord): void {
    const memory = this.tacticalMemory.get(taskId);
    if (!memory) return;

    const updatedMemory: TacticalMemory = {
      ...memory,
      toolCalls: [...memory.toolCalls, toolCall]
    };

    this.tacticalMemory.set(taskId, updatedMemory);
  }

  /**
   * Atualiza memória estratégica com resultado de tarefa.
   */
  async updateWithTaskResult(taskResult: TaskResult): Promise<void> {
    const taskId = taskResult.getTaskId();
    const tacticalMemory = this.tacticalMemory.get(taskId);
    
    // Inferir executionId a partir do taskId (implementação simplificada)
    const executionId = this.inferExecutionIdFromTaskId(taskId);
    
    const strategicMemory = await this.memoryRepository.load(executionId);
    if (!strategicMemory) return;

    // Consolidar resultado da tarefa
    const taskSummary: CompletedTaskSummary = {
      taskId,
      type: taskResult.getAgentType(),
      description: `Tarefa executada por ${taskResult.getAgentType()}`,
      outcome: taskResult.isSuccess() ? 'Sucesso' : 'Falha',
      keyFindings: this.extractKeyFindings(taskResult, tacticalMemory),
      completedAt: taskResult.getTimestamp()
    };

    // Atualizar memória estratégica
    const updatedMemory: StrategicMemory = {
      ...strategicMemory,
      summary: this.generateUpdatedSummary(strategicMemory, taskSummary),
      completedTasks: [...strategicMemory.completedTasks, taskSummary],
      currentContext: this.mergeContext(strategicMemory.currentContext, taskResult.getContext()),
      learnings: this.extractLearnings(strategicMemory.learnings, taskResult, tacticalMemory),
      updatedAt: new Date()
    };

    await this.memoryRepository.save(executionId, updatedMemory);
    
    // Limpar memória tática
    this.tacticalMemory.delete(taskId);
  }

  /**
   * Obtém resumo da memória estratégica.
   */
  async getStrategicSummary(executionId: ExecutionId): Promise<string> {
    const memory = await this.memoryRepository.load(executionId);
    return memory?.summary || 'Nenhuma memória disponível';
  }

  /**
   * Limpa contexto de execução.
   */
  async clearContext(executionId: ExecutionId): Promise<boolean> {
    return await this.memoryRepository.delete(executionId);
  }

  private extractRelevantHistory(memory: StrategicMemory, task: Task): readonly CompletedTaskSummary[] {
    // Filtrar histórico relevante baseado no tipo da tarefa
    return memory.completedTasks.filter(completed => 
      completed.type === task.getType().toString() ||
      completed.keyFindings.some(finding => 
        finding.toLowerCase().includes(task.getDescription().toLowerCase())
      )
    ).slice(-3); // Últimas 3 tarefas relevantes
  }

  private extractKeyFindings(taskResult: TaskResult, tacticalMemory?: TacticalMemory): readonly string[] {
    const findings: string[] = [];

    if (taskResult.isSuccess()) {
      findings.push('Tarefa concluída com sucesso');
      
      const payload = taskResult.getPayload();
      if (payload && typeof payload === 'object') {
        findings.push(`Resultado: ${JSON.stringify(payload).substring(0, 100)}...`);
      }
    } else {
      findings.push(`Falha: ${taskResult.getErrorMessage() || 'Erro desconhecido'}`);
    }

    // Adicionar insights da memória tática
    if (tacticalMemory && tacticalMemory.toolCalls.length > 0) {
      findings.push(`Utilizou ${tacticalMemory.toolCalls.length} ferramentas`);
    }

    return findings;
  }

  private generateUpdatedSummary(memory: StrategicMemory, newTask: CompletedTaskSummary): string {
    const taskCount = memory.completedTasks.length + 1;
    const successCount = memory.completedTasks.filter(t => t.outcome === 'Sucesso').length + 
                        (newTask.outcome === 'Sucesso' ? 1 : 0);
    
    return `Execução em progresso: ${taskCount} tarefas executadas, ${successCount} bem-sucedidas. ` +
           `Última tarefa: ${newTask.type} - ${newTask.outcome}`;
  }

  private mergeContext(existing: Record<string, unknown>, newContext?: Record<string, unknown>): Record<string, unknown> {
    if (!newContext) return existing;
    return { ...existing, ...newContext };
  }

  private extractLearnings(
    existingLearnings: readonly string[], 
    taskResult: TaskResult, 
    tacticalMemory?: TacticalMemory
  ): readonly string[] {
    const newLearnings = [...existingLearnings];

    // Adicionar learnings baseados no resultado
    if (!taskResult.isSuccess() && taskResult.getErrorMessage()) {
      newLearnings.push(`Evitar: ${taskResult.getErrorMessage()}`);
    }

    // Limitar a 10 learnings mais recentes
    return newLearnings.slice(-10);
  }

  private inferExecutionIdFromTaskId(taskId: string): ExecutionId {
    // Implementação simplificada - na prática seria mais robusta
    const executionIdStr = taskId.split('-')[0] || taskId;
    return ExecutionId.from(executionIdStr);
  }
}

/**
 * Contexto para execução de tarefa.
 * Combina memória estratégica com contexto específico da tarefa.
 */
export interface TaskExecutionContext {
  readonly executionId: ExecutionId;
  readonly strategicSummary: string;
  readonly relevantHistory: readonly CompletedTaskSummary[];
  readonly currentContext: Record<string, unknown>;
  readonly previousLearnings: readonly string[];
  readonly taskContext: Record<string, unknown>;
}