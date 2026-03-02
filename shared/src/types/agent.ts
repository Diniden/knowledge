export enum AgentType {
  KNOWLEDGE_GRAPH = 'KNOWLEDGE_GRAPH',
  DIALOG = 'DIALOG',
  GENERATIVE_UI = 'GENERATIVE_UI',
  PLAN_GENERATOR = 'PLAN_GENERATOR',
  GRAPH_CRAWLER = 'GRAPH_CRAWLER',
}

export enum AgentSessionStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
}

export interface AgentContext {
  specIds?: string[];
  documentIds?: string[];
  query?: string;
}

export interface InteractiveElement {
  type: string;
  data: Record<string, unknown>;
}

export interface GraphLink {
  specId: string;
  label?: string;
}

export interface AgentSession {
  sessionId: string;
  userId: string;
  agentType: AgentType;
  status: AgentSessionStatus;
  createdAt: string;
  context: AgentContext;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  interactiveElements?: InteractiveElement[];
  graphLinks?: GraphLink[];
  timestamp: string;
}
