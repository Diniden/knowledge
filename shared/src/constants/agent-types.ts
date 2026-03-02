import { AgentType } from '../types/agent.js';

export interface AgentTypeDescriptor {
  value: AgentType;
  label: string;
  description: string;
}

export const AGENT_TYPE_DESCRIPTORS: Record<AgentType, AgentTypeDescriptor> = {
  [AgentType.CONVERSATIONALIST]: {
    value: AgentType.CONVERSATIONALIST,
    label: 'Conversationalist',
    description:
      'General-purpose conversational agent for questions and discussions',
  },
  [AgentType.KNOWLEDGE_WRITER]: {
    value: AgentType.KNOWLEDGE_WRITER,
    label: 'Knowledge Writer',
    description: 'Creates and edits specs and documents in the knowledge graph',
  },
  [AgentType.KNOWLEDGE_GRAPH]: {
    value: AgentType.KNOWLEDGE_GRAPH,
    label: 'Knowledge Graph',
    description: 'Manages the knowledge graph structure and content',
  },
  [AgentType.DIALOG]: {
    value: AgentType.DIALOG,
    label: 'Dialog',
    description: 'Handles conversational interactions',
  },
  [AgentType.GENERATIVE_UI]: {
    value: AgentType.GENERATIVE_UI,
    label: 'Generative UI',
    description: 'Generates dynamic UI components from specs',
  },
  [AgentType.PLAN_GENERATOR]: {
    value: AgentType.PLAN_GENERATOR,
    label: 'Plan Generator',
    description: 'Creates and manages execution plans',
  },
  [AgentType.GRAPH_CRAWLER]: {
    value: AgentType.GRAPH_CRAWLER,
    label: 'Graph Crawler',
    description: 'Traverses and analyzes the knowledge graph',
  },
  [AgentType.GEN_UI_BUILDER]: {
    value: AgentType.GEN_UI_BUILDER,
    label: 'Gen UI Builder',
    description: 'Builds custom UI applications using knowledge graph data',
  },
} as const;

export const AGENT_TYPE_VALUES = Object.values(AgentType);
