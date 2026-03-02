import { AgentType } from '../types/agent.js';

export const AGENT_TYPES = Object.values(AgentType);

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  [AgentType.KNOWLEDGE_GRAPH]: 'Knowledge Graph',
  [AgentType.DIALOG]: 'Dialog',
  [AgentType.GENERATIVE_UI]: 'Generative UI',
  [AgentType.PLAN_GENERATOR]: 'Plan Generator',
  [AgentType.GRAPH_CRAWLER]: 'Graph Crawler',
};
