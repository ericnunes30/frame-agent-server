/**
 * __PROJECT_NAME__ - Graph Factory
 * 
 * Factory function for creating the execution graph
 */

import {
  createGraph,
  GraphNode,
  GraphEdge,
  GraphGraph
} from '@ericnunes/frame-agent-sdk';

export interface GraphConfig {
  maxIterations?: number;
  timeout?: number;
}

export function createProjectGraph(config: GraphConfig = {}): GraphGraph {
  const { maxIterations = 10, timeout = 60000 } = config;

  // Define nodes
  const startNode: GraphNode = {
    id: 'start',
    type: 'input',
    data: {
      prompt: 'Enter your request to start the agent'
    }
  };

  const processNode: GraphNode = {
    id: 'process',
    type: 'agent',
    data: {
      agentId: 'basic-agent',
      maxSteps: maxIterations
    }
  };

  const endNode: GraphNode = {
    id: 'end',
    type: 'output',
    data: {
      format: 'text'
    }
  };

  // Define edges
  const edges: GraphEdge[] = [
    { source: 'start', target: 'process' },
    { source: 'process', target: 'end' }
  ];

  // Create and return the graph
  return createGraph({
    id: '__PROJECT_NAME__',
    name: '__PROJECT_NAME__',
    nodes: [startNode, processNode, endNode],
    edges,
    config: {
      maxIterations,
      timeout
    }
  });
}

export default createProjectGraph;
