export enum AgentType {
  CONVERSATIONALIST = 'CONVERSATIONALIST',
  KNOWLEDGE_WRITER = 'KNOWLEDGE_WRITER',
  KNOWLEDGE_GRAPH = 'KNOWLEDGE_GRAPH',
  DIALOG = 'DIALOG',
  GENERATIVE_UI = 'GENERATIVE_UI',
  PLAN_GENERATOR = 'PLAN_GENERATOR',
  GRAPH_CRAWLER = 'GRAPH_CRAWLER',
  GEN_UI_BUILDER = 'GEN_UI_BUILDER',
}

export enum AgentSessionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  THINKING = 'THINKING',
  TOOL_USE = 'TOOL_USE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMED_OUT = 'TIMED_OUT',
}

export interface AgentContext {
  projectId: string;
  activeSpecId?: string;
  activeDocumentId?: string;
  graphFocus?: { specId: string; depth: number };
  ragResults?: Array<{ specId: string; content: string; score: number }>;
  graphSnapshot?: { nodes: number; edges: number };
  userHistory?: Array<{ role: string; content: string }>;
  availableTools?: string[];
}

export interface AgentSession {
  sessionId: string;
  userId: string;
  projectId: string;
  agentType: AgentType;
  status: AgentSessionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  context: AgentContext;
  messages: AgentMessage[];
  metadata?: Record<string, unknown>;
}

export interface InteractiveElement {
  type: 'button' | 'confirm' | 'select';
  label: string;
  action: string;
  data?: Record<string, unknown>;
}

export interface GraphLink {
  specId: string;
  title: string;
  type: 'reference' | 'suggestion' | 'result';
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  agentType?: AgentType;
  interactiveElements?: InteractiveElement[];
  graphLinks?: GraphLink[];
  toolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
    result?: string;
  }>;
  timestamp: string;
  tokenCount?: number;
}

export interface CreateSessionRequest {
  agentType?: AgentType;
  projectId: string;
  context?: Partial<AgentContext>;
}

export interface SendMessageRequest {
  content: string;
  interactiveElements?: InteractiveElement[];
}
