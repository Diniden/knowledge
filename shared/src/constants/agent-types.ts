import { AgentType } from '../types/agent.js';

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  [AgentType.KNOWLEDGE_GRAPH]: 'Knowledge Graph Agent',
  [AgentType.DIALOG]: 'Dialog Agent',
  [AgentType.GENERATIVE_UI]: 'Generative UI Agent',
  [AgentType.PLAN_GENERATOR]: 'Plan Generator Agent',
  [AgentType.GRAPH_CRAWLER]: 'Graph Crawler Agent',
};

export const AGENT_TYPE_DESCRIPTIONS: Record<AgentType, string> = {
  [AgentType.KNOWLEDGE_GRAPH]: 'Manages the knowledge graph, creates specs and edges.',
  [AgentType.DIALOG]: 'Conversational agent for knowledge authoring assistance.',
  [AgentType.GENERATIVE_UI]: 'Creates new UI components based on knowledge graph context.',
  [AgentType.PLAN_GENERATOR]: 'Generates execution plans from the knowledge graph.',
  [AgentType.GRAPH_CRAWLER]: 'Traverses the graph to find issues, conflicts, and suggestions.',
};
