/**
 * Tokens de injeção de dependência para o container.
 * Centraliza todos os identificadores usados pelo tsyringe.
 * 
 * Permite mudanças nos tokens sem afetar múltiplos arquivos
 * e facilita a descoberta de dependências.
 */

// Tokens para configuração
export const CONFIG_TOKENS = {
  IConfigurationService: Symbol('IConfigurationService')
} as const;

// Tokens para agentes
export const AGENT_TOKENS = {
  IAgentRegistry: Symbol('IAgentRegistry'),
  IAgentFactory: Symbol('IAgentFactory')
} as const;

// Tokens para ferramentas
export const TOOL_TOKENS = {
  IToolRegistry: Symbol('IToolRegistry'),
  IToolValidator: Symbol('IToolValidator')
} as const;

// Tokens para LLM
export const LLM_TOKENS = {
  ILlmApi: Symbol('ILlmApi'),
  OpenAIAdapter: Symbol('OpenAIAdapter'),
  OpenRouterAdapter: Symbol('OpenRouterAdapter')
} as const;

// Tokens para estado
export const STATE_TOKENS = {
  IStateRepository: Symbol('IStateRepository'),
  IExecutionStateFactory: Symbol('IExecutionStateFactory'),
  IExecutionStateListener: Symbol('IExecutionStateListener'),
  StateManager: Symbol('StateManager')
} as const;

// Tokens para contexto
export const CONTEXT_TOKENS = {
  IContextManager: Symbol('IContextManager'),
  IMemoryRepository: Symbol('IMemoryRepository')
} as const;

// Tokens combinados para facilitar importação
export const DI_TOKENS = {
  ...CONFIG_TOKENS,
  ...AGENT_TOKENS,
  ...TOOL_TOKENS,
  ...LLM_TOKENS,
  ...STATE_TOKENS,
  ...CONTEXT_TOKENS
} as const;

// Type helper para garantir type safety nos tokens
export type DITokens = typeof DI_TOKENS;
export type DITokenKeys = keyof DITokens;