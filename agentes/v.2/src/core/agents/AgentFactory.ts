import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import type { IAgent, AgentCreationData } from './IAgent';

/**
 * Interface para registro de tipos de agentes.
 * Permite que novos tipos sejam adicionados sem modificar a Factory.
 */
export interface IAgentRegistry {
  register(type: string, agentClass: new (...args: any[]) => IAgent): void;
  get(type: string): (new (...args: any[]) => IAgent) | undefined;
  getAvailableTypes(): readonly string[];
}

/**
 * Factory Pattern para criação de agentes.
 * Elimina condicionais (if/switch) no código principal e permite
 * extensão sem modificação (Open/Closed Principle).
 * 
 * Responsabilidades:
 * - Criar instâncias de agentes baseado no tipo
 * - Validar configurações antes da criação
 * - Gerenciar registro de tipos de agentes
 * 
 * @example
 * ```typescript
 * const factory = container.resolve(AgentFactory);
 * 
 * const agent = factory.create({
 *   type: 'researcher',
 *   configuration: {
 *     timeout: 30000,
 *     maxRetries: 3
 *   },
 *   capabilities: ['web_search', 'data_analysis']
 * });
 * ```
 */
@injectable()
export class AgentFactory {
  private readonly registry: Map<string, new (...args: any[]) => IAgent>;

  constructor(
    @inject('IAgentRegistry') agentRegistry?: IAgentRegistry
  ) {
    this.registry = new Map();
    
    // Se um registry externo foi fornecido, use-o
    if (agentRegistry) {
      this.initializeFromRegistry(agentRegistry);
    }
  }

  /**
   * Cria uma nova instância de agente baseada no tipo especificado.
   * Aplica validação antes da criação.
   */
  create(data: AgentCreationData): IAgent {
    this.validateCreationData(data);
    
    const AgentClass = this.registry.get(data.type);
    
    if (!AgentClass) {
      throw new Error(
        `Tipo de agente '${data.type}' não registrado. ` +
        `Tipos disponíveis: ${Array.from(this.registry.keys()).join(', ')}`
      );
    }

    try {
      const agent = new AgentClass(data.configuration);
      
      // Validação pós-criação
      this.validateAgent(agent, data);
      
      return agent;
    } catch (error) {
      throw new Error(
        `Falha ao criar agente do tipo '${data.type}': ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Registra um novo tipo de agente na factory.
   * Permite extensão sem modificação do código existente.
   */
  register(type: string, agentClass: new (...args: any[]) => IAgent): void {
    if (this.registry.has(type)) {
      throw new Error(`Tipo de agente '${type}' já está registrado`);
    }

    this.registry.set(type, agentClass);
  }

  /**
   * Lista todos os tipos de agentes registrados.
   */
  getAvailableTypes(): readonly string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Verifica se um tipo de agente está registrado.
   */
  isTypeRegistered(type: string): boolean {
    return this.registry.has(type);
  }

  private initializeFromRegistry(registry: IAgentRegistry): void {
    const types = registry.getAvailableTypes();
    
    for (const type of types) {
      const agentClass = registry.get(type);
      if (agentClass) {
        this.registry.set(type, agentClass);
      }
    }
  }

  private validateCreationData(data: AgentCreationData): void {
    if (!data.type?.trim()) {
      throw new Error('Tipo do agente é obrigatório');
    }

    if (!data.configuration) {
      throw new Error('Configuração do agente é obrigatória');
    }

    if (data.configuration.timeout <= 0) {
      throw new Error('Timeout deve ser positivo');
    }

    if (data.configuration.maxRetries < 0) {
      throw new Error('MaxRetries deve ser não-negativo');
    }

    if (!data.capabilities || data.capabilities.length === 0) {
      throw new Error('Agente deve ter pelo menos uma capacidade');
    }
  }

  private validateAgent(agent: IAgent, expectedData: AgentCreationData): void {
    if (agent.getType() !== expectedData.type) {
      throw new Error(
        `Tipo do agente criado (${agent.getType()}) não corresponde ao esperado (${expectedData.type})`
      );
    }

    const agentCapabilities = agent.getCapabilities();
    const missingCapabilities = expectedData.capabilities.filter(
      cap => !agentCapabilities.includes(cap)
    );

    if (missingCapabilities.length > 0) {
      throw new Error(
        `Agente não possui as capacidades esperadas: ${missingCapabilities.join(', ')}`
      );
    }
  }
}