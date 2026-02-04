/**
 * __PROJECT_NAME__ - Graph Definition
 * 
 * This file defines the execution graph for the agent
 */

import {
  createGraph,
  GraphNode,
  GraphEdge,
  GraphGraph
} from '@ericnunes/frame-agent-sdk';

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
    maxSteps: 10
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

// Create the graph
export const graph: GraphGraph = createGraph({
  id: '__PROJECT_NAME__',
  name: '__PROJECT_NAME__',
  nodes: [startNode, processNode, endNode],
  edges,
  config: {
    maxIterations: 10,
    timeout: 60000
  }
});

export default graph;
