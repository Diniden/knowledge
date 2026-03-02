import { describe, test, expect } from 'bun:test';
import { AgentRouter } from './agent-router.js';

describe('AgentRouter', () => {
  describe('spec operations', () => {
    test('should route "create spec" to KNOWLEDGE_WRITER', () => {
      expect(AgentRouter.route('Please create spec about auth')).toBe(
        'KNOWLEDGE_WRITER',
      );
    });

    test('should route "edit spec" to KNOWLEDGE_WRITER', () => {
      expect(AgentRouter.route('I want to edit spec for login flow')).toBe(
        'KNOWLEDGE_WRITER',
      );
    });

    test('should route "write spec" to KNOWLEDGE_WRITER', () => {
      expect(AgentRouter.route('Write spec for API design')).toBe(
        'KNOWLEDGE_WRITER',
      );
    });

    test('should route "update spec" to KNOWLEDGE_WRITER', () => {
      expect(AgentRouter.route('Update spec with new requirements')).toBe(
        'KNOWLEDGE_WRITER',
      );
    });

    test('should route "delete spec" to KNOWLEDGE_WRITER', () => {
      expect(AgentRouter.route('Delete spec for deprecated feature')).toBe(
        'KNOWLEDGE_WRITER',
      );
    });

    test('should route "new spec" to KNOWLEDGE_WRITER', () => {
      expect(AgentRouter.route('I need a new spec about caching')).toBe(
        'KNOWLEDGE_WRITER',
      );
    });
  });

  describe('graph operations', () => {
    test('should route "show edges" to GRAPH_CRAWLER', () => {
      expect(AgentRouter.route('Show me the edges of this spec')).toBe(
        'GRAPH_CRAWLER',
      );
    });

    test('should route "graph" queries to GRAPH_CRAWLER', () => {
      expect(AgentRouter.route('Analyze the knowledge graph')).toBe(
        'GRAPH_CRAWLER',
      );
    });

    test('should route "relationship" queries to GRAPH_CRAWLER', () => {
      expect(AgentRouter.route('What are the relationship patterns?')).toBe(
        'GRAPH_CRAWLER',
      );
    });

    test('should route "traverse" queries to GRAPH_CRAWLER', () => {
      expect(AgentRouter.route('Traverse the graph from auth spec')).toBe(
        'GRAPH_CRAWLER',
      );
    });

    test('should route "neighbor" queries to GRAPH_CRAWLER', () => {
      expect(AgentRouter.route('Who are the neighbor specs?')).toBe(
        'GRAPH_CRAWLER',
      );
    });

    test('should route "connect" queries to GRAPH_CRAWLER', () => {
      expect(
        AgentRouter.route('How do these specs connect to each other?'),
      ).toBe('GRAPH_CRAWLER');
    });
  });

  describe('plan operations', () => {
    test('should route "generate plan" to PLAN_GENERATOR', () => {
      expect(AgentRouter.route('Generate plan for the auth module')).toBe(
        'PLAN_GENERATOR',
      );
    });

    test('should route "plan" to PLAN_GENERATOR', () => {
      expect(AgentRouter.route('I need a plan for implementation')).toBe(
        'PLAN_GENERATOR',
      );
    });

    test('should route "execution steps" to PLAN_GENERATOR', () => {
      expect(AgentRouter.route('What are the execution steps for this?')).toBe(
        'PLAN_GENERATOR',
      );
    });

    test('should route "build steps" to PLAN_GENERATOR', () => {
      expect(AgentRouter.route('List the build steps for frontend')).toBe(
        'PLAN_GENERATOR',
      );
    });
  });

  describe('UI generation', () => {
    test('should route "generate ui" to GEN_UI_BUILDER', () => {
      expect(AgentRouter.route('Generate UI for the dashboard')).toBe(
        'GEN_UI_BUILDER',
      );
    });

    test('should route "build ui" to GEN_UI_BUILDER', () => {
      expect(AgentRouter.route('Build UI for settings page')).toBe(
        'GEN_UI_BUILDER',
      );
    });

    test('should route "create component" to GEN_UI_BUILDER', () => {
      expect(AgentRouter.route('Create component for user profile')).toBe(
        'GEN_UI_BUILDER',
      );
    });

    test('should route "visualization" to GEN_UI_BUILDER', () => {
      expect(AgentRouter.route('Create a visualization of specs')).toBe(
        'GEN_UI_BUILDER',
      );
    });
  });

  describe('general conversation', () => {
    test('should route general questions to CONVERSATIONALIST', () => {
      expect(AgentRouter.route('Hello, how are you?')).toBe(
        'CONVERSATIONALIST',
      );
    });

    test('should route informational queries to CONVERSATIONALIST', () => {
      expect(
        AgentRouter.route('What is the best way to organize my notes?'),
      ).toBe('CONVERSATIONALIST');
    });

    test('should route help requests to CONVERSATIONALIST', () => {
      expect(AgentRouter.route('Help me understand this tool')).toBe(
        'CONVERSATIONALIST',
      );
    });

    test('should route ambiguous messages to CONVERSATIONALIST', () => {
      expect(AgentRouter.route('Tell me about the project')).toBe(
        'CONVERSATIONALIST',
      );
    });
  });

  describe('case insensitivity', () => {
    test('should handle uppercase input', () => {
      expect(AgentRouter.route('CREATE SPEC about auth')).toBe(
        'KNOWLEDGE_WRITER',
      );
    });

    test('should handle mixed case input', () => {
      expect(AgentRouter.route('Show me the GRAPH structure')).toBe(
        'GRAPH_CRAWLER',
      );
    });
  });
});
