import { describe, test, expect, beforeEach } from 'bun:test';
import { ChatStore } from './ChatStore.js';
import type { AgentMessage, AgentSession, AgentType } from '@kg/shared';

function makeSession(
  id: string,
  overrides?: Partial<AgentSession>,
): AgentSession {
  return {
    sessionId: id,
    userId: 'user-1',
    projectId: 'project-1',
    agentType: 'CONVERSATIONALIST' as AgentType,
    status: 'ACTIVE' as AgentSession['status'],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    context: { projectId: 'project-1' },
    messages: [],
    ...overrides,
  };
}

function makeMessage(
  id: string,
  sessionId: string,
  role: AgentMessage['role'] = 'user',
  content = 'Hello',
): AgentMessage {
  return {
    id,
    sessionId,
    role,
    content,
    timestamp: '2026-03-01T10:00:00Z',
  };
}

describe('ChatStore', () => {
  let store: ChatStore;

  beforeEach(() => {
    store = new ChatStore();
    // Clear mock data that constructor initializes
    store.sessions.clear();
    store.messages.clear();
    store.activeSessionId = null;
  });

  describe('addMessage', () => {
    test('should add a message to a session', () => {
      const session = makeSession('s-1');
      store.setSession(session);
      store.messages.set('s-1', []);

      const msg = makeMessage('m-1', 's-1', 'user', 'Hello world');
      store.addMessage('s-1', msg);

      const msgs = store.messages.get('s-1');
      expect(msgs).toBeDefined();
      expect(msgs!.length).toBe(1);
      expect(msgs![0]!.content).toBe('Hello world');
    });

    test('should append multiple messages in order', () => {
      store.messages.set('s-1', []);

      store.addMessage('s-1', makeMessage('m-1', 's-1', 'user', 'First'));
      store.addMessage('s-1', makeMessage('m-2', 's-1', 'agent', 'Second'));
      store.addMessage('s-1', makeMessage('m-3', 's-1', 'user', 'Third'));

      const msgs = store.messages.get('s-1')!;
      expect(msgs).toHaveLength(3);
      expect(msgs[0]!.content).toBe('First');
      expect(msgs[1]!.content).toBe('Second');
      expect(msgs[2]!.content).toBe('Third');
    });
  });

  describe('newConversation', () => {
    test('should create a new conversation', () => {
      store.newConversation();

      expect(store.activeSessionId).not.toBeNull();
      expect(store.sessions.size).toBe(1);
      expect(store.messages.size).toBe(1);

      const session = store.sessions.get(store.activeSessionId!);
      expect(session).toBeDefined();
      expect(session!.status).toBe('ACTIVE');
    });

    test('should create conversation with initial system message', () => {
      store.newConversation();

      const msgs = store.messages.get(store.activeSessionId!);
      expect(msgs).toBeDefined();
      expect(msgs!.length).toBe(1);
      expect(msgs![0]!.role).toBe('system');
    });
  });

  describe('agent status tracking', () => {
    test('should track agent status', () => {
      expect(store.agentStatus).toBe('idle');

      store.setAgentStatus('thinking');
      expect(store.agentStatus).toBe('thinking');

      store.setAgentStatus('tool_use', 'rag_search');
      expect(store.agentStatus).toBe('tool_use');
      expect(store.agentCurrentTool).toBe('rag_search');

      store.setAgentStatus('idle');
      expect(store.agentStatus).toBe('idle');
    });
  });

  describe('selectConversation', () => {
    test('should switch to an existing conversation', () => {
      const s1 = makeSession('s-1');
      const s2 = makeSession('s-2');
      store.setSession(s1);
      store.setSession(s2);
      store.setActiveSession('s-1');

      store.selectConversation('s-2');
      expect(store.activeSessionId).toBe('s-2');
    });

    test('should not switch to non-existent conversation', () => {
      store.setActiveSession('s-1');
      store.selectConversation('does-not-exist');
      expect(store.activeSessionId).toBe('s-1');
    });
  });

  describe('deleteConversation', () => {
    test('should remove a conversation and switch to next', () => {
      const s1 = makeSession('s-1');
      const s2 = makeSession('s-2');
      store.setSession(s1);
      store.setSession(s2);
      store.messages.set('s-1', []);
      store.messages.set('s-2', []);
      store.setActiveSession('s-1');

      store.deleteConversation('s-1');

      expect(store.sessions.has('s-1')).toBe(false);
      expect(store.messages.has('s-1')).toBe(false);
      expect(store.activeSessionId).toBe('s-2');
    });
  });

  describe('computed properties', () => {
    test('activeSession returns the current session', () => {
      const session = makeSession('s-1');
      store.setSession(session);
      store.setActiveSession('s-1');

      expect(store.activeSession).toBeDefined();
      expect(store.activeSession!.sessionId).toBe('s-1');
    });

    test('activeSession returns undefined when no active session', () => {
      expect(store.activeSession).toBeUndefined();
    });

    test('activeMessages returns messages for the active session', () => {
      store.setSession(makeSession('s-1'));
      store.setActiveSession('s-1');
      store.messages.set('s-1', [makeMessage('m-1', 's-1', 'user', 'Test')]);

      expect(store.activeMessages).toHaveLength(1);
      expect(store.activeMessages[0]!.content).toBe('Test');
    });

    test('conversationList returns all sessions as conversations', () => {
      store.setSession(makeSession('s-1', { metadata: { title: 'Conv 1' } }));
      store.setSession(makeSession('s-2', { metadata: { title: 'Conv 2' } }));
      store.messages.set('s-1', []);
      store.messages.set('s-2', []);

      const list = store.conversationList;
      expect(list).toHaveLength(2);
    });
  });

  describe('cancelOperation', () => {
    test('should reset agent status and streaming', () => {
      store.setAgentStatus('thinking');
      store.setStreaming(true);

      store.cancelOperation();

      expect(store.agentStatus).toBe('idle');
      expect(store.isStreaming).toBe(false);
    });
  });
});
