import 'reflect-metadata';
import { container, Lifecycle } from 'tsyringe';

// Importar tokens
import { DI_TOKENS } from './tokens';

// Importar interfaces
import type { IConfigurationService } from '@infrastructure/config/IConfigurationService';
import type { IAgentRegistry } from '@core/agents/AgentFactory';
import type { IToolValidator } from '@infrastructure/tools/registry/ToolRegistry';
import type { IExecutionStateFactory, IExecutionStateListener } from '@core/state/IExecutionState';
import type { IStateRepository } from '@core/state/StateManager';

// Importar implementações
import { ConfigurationService } from '@infrastructure/config/ConfigurationService';
import { AgentFactory } from '@core/agents/AgentFactory';
import { ToolRegistry } from '@infrastructure/tools/registry/ToolRegistry';
import { StateManager } from '@core/state/StateManager';

/**
 * Container de injeção de dependência centralizado.
 * Configura todas as dependências do sistema seguindo o padrão DI.
 * 
 * Responsabilidades:
 * - Registrar implementações para interfaces
 * - Configurar ciclo de vida dos objetos
 * - Fornecer resolução de dependências
 * - Suportar configuração hierárquica
 * 
 * @example
 * ```typescript
 * // Configurar container
 * setupDIContainer();
 * 
 * // Resolver dependência
 * const configService = container.resolve<IConfigurationService>(DI_TOKENS.IConfigurationService);
 * ```
 */
export class DIContainer {
  private static isConfigured = false;

  /**
   * Configura todas as dependências do container.
   * Deve ser chamado uma única vez na inicialização da aplicação.
   */
  static configure(): void {
    if (this.isConfigured) {
      return;
    }

    this.registerConfiguration();
    this.registerAgents();
    this.registerTools();
    this.registerState();
    this.registerInfrastructure();

    this.isConfigured = true;
  }

  /**
   * Limpa configurações do container.
   * Útil para testes ou reinicialização.
   */
  static reset(): void {
    container.clearInstances();
    this.isConfigured = false;
  }

  /**
   * Registra implementações de configuração.
   */
  private static registerConfiguration(): void {
    container.registerSingleton<IConfigurationService>(
      DI_TOKENS.IConfigurationService,
      ConfigurationService
    );
  }

  /**
   * Registra implementações de agentes.
   */
  private static registerAgents(): void {
    // AgentFactory como singleton
    container.registerSingleton(
      DI_TOKENS.IAgentFactory,
      AgentFactory
    );

    // Registry placeholder - será implementado quando necessário
    // container.register<IAgentRegistry>(
    //   DI_TOKENS.IAgentRegistry,
    //   PlaceholderAgentRegistry,
    //   { lifecycle: Lifecycle.Singleton }
    // );
  }

  /**
   * Registra implementações de ferramentas.
   */
  private static registerTools(): void {
    container.registerSingleton(
      DI_TOKENS.IToolRegistry,
      ToolRegistry
    );
  }

  /**
   * Registra implementações de estado.
   */
  private static registerState(): void {
    container.registerSingleton(
      DI_TOKENS.StateManager,
      StateManager
    );

    // Placeholders para interfaces que serão implementadas
    // container.register<IStateRepository>(
    //   DI_TOKENS.IStateRepository,
    //   PlaceholderStateRepository,
    //   { lifecycle: Lifecycle.Singleton }
    // );

    // container.register<IExecutionStateFactory>(
    //   DI_TOKENS.IExecutionStateFactory,
    //   PlaceholderStateFactory,
    //   { lifecycle: Lifecycle.Singleton }
    // );
  }

  /**
   * Registra implementações de infraestrutura.
   */
  private static registerInfrastructure(): void {
    // Implementações específicas serão adicionadas conforme necessário
  }

  /**
   * Registra uma nova implementação no container.
   * Permite extensão dinâmica das dependências.
   */
  static registerImplementation<T>(
    token: symbol,
    implementation: new (...args: any[]) => T,
    lifecycle: Lifecycle = Lifecycle.Transient
  ): void {
    container.register<T>(token, implementation, { lifecycle });
  }

  /**
   * Registra uma instância específica no container.
   */
  static registerInstance<T>(token: symbol, instance: T): void {
    container.registerInstance(token, instance);
  }

  /**
   * Resolve uma dependência do container.
   */
  static resolve<T>(token: symbol): T {
    return container.resolve<T>(token);
  }

  /**
   * Verifica se o container está configurado.
   */
  static get isSetup(): boolean {
    return this.isConfigured;
  }
}

/**
 * Função de conveniência para configurar o container.
 * Pode ser chamada múltiplas vezes sem efeito colateral.
 */
export function setupDIContainer(): void {
  DIContainer.configure();
}

/**
 * Re-export do container do tsyringe para uso direto.
 */
export { container } from 'tsyringe';