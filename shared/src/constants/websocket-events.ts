export const WS_EVENTS = {
  AGENT_STATUS_UPDATE: 'agent:status_update',
  AGENT_MESSAGE: 'agent:message',
  AGENT_THINKING: 'agent:thinking',
  AGENT_DONE: 'agent:done',
  AGENT_ERROR: 'agent:error',

  SPEC_CREATED: 'spec:created',
  SPEC_UPDATED: 'spec:updated',
  SPEC_DELETED: 'spec:deleted',

  GRAPH_SYNC: 'graph:sync',
  DOCUMENT_SYNC: 'document:sync',
  FULL_SYNC: 'full:sync',

  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',

  INQUIRY_ADDED: 'inquiry:added',
  INQUIRY_RESOLVED: 'inquiry:resolved',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
