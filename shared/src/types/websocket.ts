import type { AgentMessage, AgentSessionStatus } from './agent.js';

export interface AgentStatusUpdate {
  sessionId: string;
  status: AgentSessionStatus;
  progress?: number;
  message?: string;
}

export interface AgentMessageEvent {
  sessionId: string;
  message: AgentMessage;
}

export interface SpecChangeEvent {
  specId: string;
  documentId: string;
  changeType: 'created' | 'updated' | 'deleted';
  userId: string;
}

export interface SyncEvent {
  projectId: string;
  status: 'syncing' | 'synced' | 'error';
  branch: string;
  commitHash?: string;
}

export interface WebSocketEventMap {
  'agent:status': AgentStatusUpdate;
  'agent:message': AgentMessageEvent;
  'spec:created': SpecChangeEvent;
  'spec:updated': SpecChangeEvent;
  'spec:deleted': SpecChangeEvent;
  'sync:response': SyncEvent;
}
