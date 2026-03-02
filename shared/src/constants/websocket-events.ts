export const WS_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // Agent events
  AGENT_STATUS: 'agent:status',
  AGENT_MESSAGE: 'agent:message',
  AGENT_MESSAGE_STREAM: 'agent:message:stream',
  AGENT_ERROR: 'agent:error',

  // Spec events
  SPEC_CREATED: 'spec:created',
  SPEC_UPDATED: 'spec:updated',
  SPEC_DELETED: 'spec:deleted',

  // Edge events
  EDGE_CREATED: 'edge:created',
  EDGE_DELETED: 'edge:deleted',

  // Document events
  DOCUMENT_CREATED: 'document:created',
  DOCUMENT_UPDATED: 'document:updated',

  // Sync events
  SYNC_REQUEST: 'sync:request',
  SYNC_RESPONSE: 'sync:response',
  SYNC_FULL: 'sync:full',

  // Collaboration
  USER_JOINED: 'collab:user_joined',
  USER_LEFT: 'collab:user_left',
  CURSOR_MOVE: 'collab:cursor_move',

  // Notifications
  NOTIFICATION: 'notification',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
