import { makeObservable, observable, action, computed } from 'mobx';
import type { AgentMessage, AgentSession, AgentType } from '@kg/shared';
import type { AgentStatusBarProps } from '../../features/chat/AgentStatusBar.js';
import type { ChatConversation } from '../../features/chat/ChatHistory.js';
import type { ChatMessageProps } from '../../features/chat/ChatMessage.js';

export class ChatStore {
  sessions: Map<string, AgentSession> = new Map();
  messages: Map<string, AgentMessage[]> = new Map();
  activeSessionId: string | null = null;
  isStreaming = false;
  agentStatus: AgentStatusBarProps['status'] = 'idle';
  agentCurrentTool: string | undefined = undefined;

  constructor() {
    makeObservable(this, {
      sessions: observable,
      messages: observable,
      activeSessionId: observable,
      isStreaming: observable,
      agentStatus: observable,
      agentCurrentTool: observable,
      activeSession: computed,
      activeMessages: computed,
      conversationList: computed,
      chatMessages: computed,
      agentStatusProps: computed,
      setActiveSession: action.bound,
      addMessage: action.bound,
      setSession: action.bound,
      setStreaming: action.bound,
      sendMessage: action.bound,
      cancelOperation: action.bound,
      newConversation: action.bound,
      selectConversation: action.bound,
      deleteConversation: action.bound,
      setAgentStatus: action.bound,
    });

    this.initializeMockData();
  }

  get activeSession(): AgentSession | undefined {
    return this.activeSessionId
      ? this.sessions.get(this.activeSessionId)
      : undefined;
  }

  get activeMessages(): AgentMessage[] {
    return this.activeSessionId
      ? (this.messages.get(this.activeSessionId) ?? [])
      : [];
  }

  get conversationList(): ChatConversation[] {
    return Array.from(this.sessions.values()).map((session) => {
      const msgs = this.messages.get(session.sessionId) ?? [];
      const lastMsg = msgs[msgs.length - 1];
      return {
        id: session.sessionId,
        title:
          (session.metadata?.['title'] as string) ??
          `Session ${session.sessionId.slice(0, 8)}`,
        lastMessage: lastMsg?.content.slice(0, 80) ?? '',
        date: new Date(session.updatedAt).toLocaleDateString(),
        messageCount: msgs.length,
      };
    });
  }

  get chatMessages(): ChatMessageProps[] {
    return this.activeMessages.map((msg) => ({
      id: msg.id,
      role: msg.role === 'agent' ? ('assistant' as const) : msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      status: 'sent' as const,
      isStreaming: false,
      interactiveElements: msg.interactiveElements?.map((el) => ({
        type:
          el.type === 'button'
            ? ('accept' as const)
            : el.type === 'confirm'
              ? ('reject' as const)
              : ('edit' as const),
        label: el.label,
        data: el.data,
      })),
    }));
  }

  get agentStatusProps(): AgentStatusBarProps {
    return {
      status: this.agentStatus,
      currentTool: this.agentCurrentTool,
      agentType: this.activeSession?.agentType,
    };
  }

  setActiveSession(sessionId: string | null) {
    this.activeSessionId = sessionId;
  }

  addMessage(sessionId: string, message: AgentMessage) {
    const existing = this.messages.get(sessionId) ?? [];
    existing.push(message);
    this.messages.set(sessionId, existing);
  }

  setSession(session: AgentSession) {
    this.sessions.set(session.sessionId, session);
  }

  setStreaming(streaming: boolean) {
    this.isStreaming = streaming;
  }

  setAgentStatus(status: AgentStatusBarProps['status'], tool?: string) {
    this.agentStatus = status;
    this.agentCurrentTool = tool;
  }

  sendMessage(content: string) {
    if (!this.activeSessionId) return;

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMessage: AgentMessage = {
      id: msgId,
      sessionId: this.activeSessionId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    this.addMessage(this.activeSessionId, userMessage);

    this.setAgentStatus('thinking');
    setTimeout(
      action(() => {
        if (!this.activeSessionId) return;

        const replyId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const reply: AgentMessage = {
          id: replyId,
          sessionId: this.activeSessionId,
          role: 'agent',
          content: `I received your message: **"${content}"**\n\nThis is a mock response. In the full implementation, this would be processed by the agent system via WebSocket.`,
          timestamp: new Date().toISOString(),
        };

        this.addMessage(this.activeSessionId, reply);
        this.setAgentStatus('idle');
      }),
      1500,
    );
  }

  cancelOperation() {
    this.setAgentStatus('idle');
    this.setStreaming(false);
  }

  newConversation() {
    const sessionId = `session-${Date.now()}`;
    const session: AgentSession = {
      sessionId,
      userId: 'current-user',
      projectId: 'default-project',
      agentType: 'CONVERSATIONALIST' as AgentType,
      status: 'ACTIVE' as AgentSession['status'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: { projectId: 'default-project' },
      messages: [],
      metadata: { title: 'New Conversation' },
    };

    this.setSession(session);
    this.messages.set(sessionId, []);
    this.setActiveSession(sessionId);

    const systemMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      sessionId,
      role: 'system',
      content: 'How can I help you with your knowledge graph?',
      timestamp: new Date().toISOString(),
    };
    this.addMessage(sessionId, systemMsg);
  }

  selectConversation(id: string) {
    if (this.sessions.has(id)) {
      this.setActiveSession(id);
    }
  }

  deleteConversation(id: string) {
    this.sessions.delete(id);
    this.messages.delete(id);
    if (this.activeSessionId === id) {
      const remaining = Array.from(this.sessions.keys());
      this.activeSessionId = remaining[0] ?? null;
    }
  }

  getSessionsByType(type: AgentType): AgentSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.agentType === type,
    );
  }

  private initializeMockData() {
    const sessionId = 'session-mock-1';
    const session: AgentSession = {
      sessionId,
      userId: 'user-1',
      projectId: 'project-1',
      agentType: 'CONVERSATIONALIST' as AgentType,
      status: 'ACTIVE' as AgentSession['status'],
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-01T10:05:00Z',
      context: { projectId: 'project-1' },
      messages: [],
      metadata: { title: 'Getting started with Knowledge Graph' },
    };

    const mockMessages: AgentMessage[] = [
      {
        id: 'msg-1',
        sessionId,
        role: 'system',
        content: 'Welcome! How can I help you with your knowledge graph?',
        timestamp: '2026-03-01T10:00:00Z',
      },
      {
        id: 'msg-2',
        sessionId,
        role: 'user',
        content: 'Can you explain how specs are connected in the graph?',
        timestamp: '2026-03-01T10:01:00Z',
      },
      {
        id: 'msg-3',
        sessionId,
        role: 'agent',
        content:
          'Specs in the knowledge graph are connected through **edges** that represent relationships.\n\nThere are several edge types:\n- **depends_on** — one spec requires another\n- **related_to** — specs share a topic\n- **refines** — one spec adds detail to another\n\nYou can use the graph view to visualize these connections. Would you like me to analyze the current graph structure?',
        timestamp: '2026-03-01T10:01:30Z',
        interactiveElements: [
          { type: 'button', label: 'Analyze Graph', action: 'analyze' },
          { type: 'button', label: 'Show Examples', action: 'examples' },
        ],
      },
    ];

    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, mockMessages);
    this.activeSessionId = sessionId;
  }
}
