import type { AgentMessage, AgentSessionStatus } from './agent.js';
import type { Spec } from './spec.js';

export interface AgentStatusUpdate {
  sessionId: string;
  userId: string;
  status: AgentSessionStatus;
  timestamp: string;
}

export interface AgentMessageEvent {
  sessionId: string;
  message: AgentMessage;
}

export interface SpecChangeEvent {
  specId: string;
  documentId: string;
  changeType: 'created' | 'updated' | 'deleted';
  changedBy: string;
  timestamp: string;
  spec?: Spec;
}

export interface SyncEvent {
  type: 'graph-sync' | 'document-sync' | 'full-sync';
  userId: string;
  timestamp: string;
  affectedIds?: string[];
}
