/**
 * Mock GraphEngine para testes
 */
module.exports = {
  graph: {
    execute: async ({ messages }) => {
      // Simula delay de execução
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        state: {
          messages: [
            ...messages,
            { role: 'assistant', content: 'Mock response' }
          ],
          data: {},
          metadata: {}
        },
        status: 'FINISHED'
      };
    }
  }
};
