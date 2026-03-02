import type { AgentSession, AgentMessage, AgentType } from '@kg/shared';
import { AGENT_ROUTES } from '@kg/shared';
import { apiClient } from './client';

export const agentApi = {
  createSession: (agentType: AgentType) =>
    apiClient.post<AgentSession>(AGENT_ROUTES.SESSIONS, { agentType }),

  getSession: (id: string) =>
    apiClient.get<AgentSession>(AGENT_ROUTES.SESSION(id)),

  listSessions: () => apiClient.get<AgentSession[]>(AGENT_ROUTES.SESSIONS),

  sendMessage: (sessionId: string, content: string) =>
    apiClient.post<AgentMessage>(AGENT_ROUTES.MESSAGE(sessionId), {
      content,
    }),

  getMessages: (sessionId: string) =>
    apiClient.get<AgentMessage[]>(AGENT_ROUTES.MESSAGES(sessionId)),
};
