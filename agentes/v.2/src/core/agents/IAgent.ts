import type { Task } from '@core/orchestration/types/Task';
import type { TaskResult } from '@core/orchestration/types/TaskResult';

/**
 * Interface Strategy para agentes do sistema.
 * Define o contrato que todos os agentes devem implementar,
 * permitindo intercambiabilidade e polimorfismo.
 * 
 * Aplicação do padrão Strategy Pattern - cada agente é uma estratégia
 * específica para executar tarefas, mas todos seguem o mesmo contrato.
 * 
 * @example
 * ```typescript
 * class ResearcherAgent implements IAgent {
 *   async execute(task: Task): Promise<TaskResult> {
 *     // Implementação específica para pesquisa
 *   }
 * 
 *   getType(): string {
 *     return 'researcher';
 *   }
 * 
 *   getCapabilities(): string[] {
 *     return ['web_search', 'data_analysis'];
 *   }
 * }
 * ```
 */
export interface IAgent {
  /**
   * Executa uma tarefa e retorna o resultado estruturado.
   * Este é o método principal que define o comportamento do agente.
   * 
   * @param task - Tarefa a ser executada
   * @returns Promise com resultado estruturado contendo status, payload e metadata
   */
  execute(task: Task): Promise<TaskResult>;

  /**
   * Retorna o tipo/identificador único do agente.
   * Usado pela Factory para criar instâncias corretas.
   */
  getType(): string;

  /**
   * Lista as capacidades/ferramentas que este agente pode utilizar.
   * Usado para validação e roteamento de tarefas.
   */
  getCapabilities(): readonly string[];

  /**
   * Retorna configurações específicas do agente.
   * Pode incluir timeouts, modelos preferidos, etc.
   */
  getConfiguration(): AgentConfiguration;
}

/**
 * Interface para configuração de agentes.
 * Encapsula configurações específicas de cada tipo de agente.
 */
export interface AgentConfiguration {
  readonly timeout: number;
  readonly maxRetries: number;
  readonly preferredModel?: string;
  readonly temperature?: number;
  readonly customSettings?: Record<string, unknown>;
}

/**
 * Dados necessários para criação de um agente.
 * Usado pela AgentFactory para instanciar agentes.
 */
export interface AgentCreationData {
  readonly type: string;
  readonly configuration: AgentConfiguration;
  readonly capabilities: readonly string[];
}