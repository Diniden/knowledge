import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { AgentType, AgentSessionStatus } from '@kg/shared';
import type { AgentSession, AgentMessage } from '@kg/shared';
import { AgentOrchestratorService } from './agent-orchestrator.service.js';

function makeSession(overrides?: Partial<AgentSession>): AgentSession {
  return {
    sessionId: 'session-1',
    userId: 'user-1',
    projectId: 'project-1',
    agentType: AgentType.CONVERSATIONALIST,
    status: AgentSessionStatus.ACTIVE,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    context: { projectId: 'project-1' },
    messages: [],
    ...overrides,
  };
}

function makeMessage(
  role: AgentMessage['role'] = 'agent',
  content = 'Response',
): AgentMessage {
  return {
    id: 'msg-1',
    sessionId: 'session-1',
    role,
    content,
    timestamp: '2026-01-01T00:00:00Z',
  };
}

function createMockSessionService() {
  return {
    findById: mock(() => Promise.resolve(makeSession())),
    create: mock(() =>
      Promise.resolve(makeSession({ status: AgentSessionStatus.PENDING })),
    ),
    updateStatus: mock(() => Promise.resolve()),
    addMessage: mock(
      (
        _sessionId: string,
        role: AgentMessage['role'],
        content: string,
        _extra?: Record<string, unknown>,
      ) => Promise.resolve(makeMessage(role, content)),
    ),
    getMessages: mock(() => Promise.resolve([])),
    end: mock(() => Promise.resolve()),
    getUserActiveSessions: mock(() => Promise.resolve([])),
    getActiveSessionCount: mock(() => Promise.resolve(0)),
  };
}

function createMockConfigService() {
  return {
    get: mock((key: string, defaultValue?: unknown) => defaultValue),
  };
}

describe('AgentOrchestratorService', () => {
  let orchestrator: AgentOrchestratorService;
  let sessionService: ReturnType<typeof createMockSessionService>;
  let configService: ReturnType<typeof createMockConfigService>;

  beforeEach(() => {
    sessionService = createMockSessionService();
    configService = createMockConfigService();
    orchestrator = new AgentOrchestratorService(
      sessionService as never,
      configService as never,
    );
  });

  describe('createSession', () => {
    test('should create a new session', async () => {
      const sessionId = await orchestrator.createSession('user-1', 'project-1');

      expect(sessionId).toBeDefined();
      expect(sessionService.create).toHaveBeenCalledTimes(1);
      expect(sessionService.updateStatus).toHaveBeenCalledWith(
        expect.any(String),
        AgentSessionStatus.ACTIVE,
      );
    });

    test('should enforce concurrent session limits', async () => {
      configService.get.mockReturnValue(2);
      sessionService.getActiveSessionCount.mockResolvedValue(2);

      await expect(
        orchestrator.createSession('user-1', 'project-1'),
      ).rejects.toThrow(/Maximum concurrent sessions/);
    });

    test('should default to CONVERSATIONALIST when no type specified', async () => {
      await orchestrator.createSession('user-1', 'project-1');

      expect(sessionService.create).toHaveBeenCalledWith(
        'user-1',
        'project-1',
        AgentType.CONVERSATIONALIST,
      );
    });

    test('should accept a specific agent type', async () => {
      await orchestrator.createSession(
        'user-1',
        'project-1',
        AgentType.GRAPH_CRAWLER,
      );

      expect(sessionService.create).toHaveBeenCalledWith(
        'user-1',
        'project-1',
        AgentType.GRAPH_CRAWLER,
      );
    });
  });

  describe('handleUserMessage', () => {
    test('should route conversational messages to CONVERSATIONALIST', async () => {
      sessionService.findById.mockResolvedValue(
        makeSession({ agentType: AgentType.CONVERSATIONALIST }),
      );

      const response = await orchestrator.handleUserMessage(
        'user-1',
        'session-1',
        'Hello, how are you?',
      );

      expect(response).toBeDefined();
      expect(response.content).toContain('Conversationalist');
    });

    test('should route spec creation to KNOWLEDGE_WRITER', async () => {
      sessionService.findById.mockResolvedValue(
        makeSession({ agentType: AgentType.CONVERSATIONALIST }),
      );

      const response = await orchestrator.handleUserMessage(
        'user-1',
        'session-1',
        'Please create spec about authentication',
      );

      expect(response).toBeDefined();
      expect(response.content).toContain('Knowledge Agent');
    });

    test('should preserve session agent type for non-conversational sessions', async () => {
      sessionService.findById.mockResolvedValue(
        makeSession({ agentType: AgentType.GRAPH_CRAWLER }),
      );

      const response = await orchestrator.handleUserMessage(
        'user-1',
        'session-1',
        'Hello, how are you?',
      );

      expect(response.content).toContain('Graph Crawler');
    });

    test('should reject messages from wrong user', async () => {
      sessionService.findById.mockResolvedValue(
        makeSession({ userId: 'other-user' }),
      );

      await expect(
        orchestrator.handleUserMessage('user-1', 'session-1', 'Hello'),
      ).rejects.toThrow(/does not belong/);
    });

    test('should update session status during processing', async () => {
      await orchestrator.handleUserMessage('user-1', 'session-1', 'Hello');

      expect(sessionService.updateStatus).toHaveBeenCalledWith(
        'session-1',
        AgentSessionStatus.THINKING,
      );
      expect(sessionService.updateStatus).toHaveBeenCalledWith(
        'session-1',
        AgentSessionStatus.ACTIVE,
      );
    });
  });

  describe('cancelOperation', () => {
    test('should cancel an active session', async () => {
      sessionService.findById.mockResolvedValue(
        makeSession({ status: AgentSessionStatus.ACTIVE }),
      );

      await orchestrator.cancelOperation('session-1');

      expect(sessionService.updateStatus).toHaveBeenCalledWith(
        'session-1',
        AgentSessionStatus.CANCELLED,
      );
    });

    test('should reject cancellation of completed sessions', async () => {
      sessionService.findById.mockResolvedValue(
        makeSession({ status: AgentSessionStatus.COMPLETED }),
      );

      await expect(orchestrator.cancelOperation('session-1')).rejects.toThrow(
        /Cannot cancel/,
      );
    });
  });
});
