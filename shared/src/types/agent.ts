export enum AgentType {
  KNOWLEDGE_GRAPH = 'KNOWLEDGE_GRAPH',
  DIALOG = 'DIALOG',
  GENERATIVE_UI = 'GENERATIVE_UI',
  PLAN_GENERATOR = 'PLAN_GENERATOR',
  GRAPH_CRAWLER = 'GRAPH_CRAWLER',
}

export enum AgentSessionStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  RUNNING = 'RUNNING',
  WAITING_FOR_INPUT = 'WAITING_FOR_INPUT',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface AgentContext {
  currentSpecId?: string;
  currentDocumentId?: string;
  recentSpecIds?: string[];
  userQuery?: string;
  additionalContext?: Record<string, unknown>;
}

export interface GraphLink {
  specId: string;
  title: string;
  label?: string;
}

export interface InteractiveElement {
  id: string;
  type: 'button' | 'choice' | 'input' | 'confirm';
  label: string;
  payload?: unknown;
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

export interface AgentSession {
  sessionId: string;
  userId: string;
  agentType: AgentType;
  status: AgentSessionStatus;
  createdAt: string;
  context: AgentContext;
}

export interface StartAgentSessionDto {
  agentType: AgentType;
  context?: AgentContext;
}

export interface SendAgentMessageDto {
  content: string;
  interactiveElementId?: string;
  payload?: unknown;
}
