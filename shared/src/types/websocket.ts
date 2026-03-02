import type { AgentMessage } from './agent.js';

export interface AgentStatusUpdate {
  sessionId: string;
  status: string;
}

export interface AgentMessageEvent {
  sessionId: string;
  message: AgentMessage;
}

export interface SpecChangeEvent {
  specId: string;
  action: 'created' | 'updated' | 'deleted';
}

export interface SyncEvent {
  type: 'full' | 'delta';
}
