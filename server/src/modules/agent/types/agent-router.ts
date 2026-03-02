export class AgentRouter {
  /**
   * Simple keyword-based routing for MVP.
   * Returns the AgentType string to route to.
   * Will be replaced by LLM-based classification in a later phase.
   */
  static route(message: string, _context?: unknown): string {
    const lower = message.toLowerCase();

    if (
      lower.includes('create spec') ||
      lower.includes('edit spec') ||
      lower.includes('write spec') ||
      lower.includes('update spec') ||
      lower.includes('delete spec') ||
      lower.includes('new spec')
    ) {
      return 'KNOWLEDGE_WRITER';
    }

    if (
      lower.includes('graph') ||
      lower.includes('edge') ||
      lower.includes('relationship') ||
      lower.includes('connect') ||
      lower.includes('traverse') ||
      lower.includes('neighbor')
    ) {
      return 'GRAPH_CRAWLER';
    }

    if (
      lower.includes('plan') ||
      lower.includes('generate plan') ||
      lower.includes('execution steps') ||
      lower.includes('build steps')
    ) {
      return 'PLAN_GENERATOR';
    }

    if (
      lower.includes('generate ui') ||
      lower.includes('build ui') ||
      lower.includes('create interface') ||
      lower.includes('create component') ||
      lower.includes('visualization')
    ) {
      return 'GEN_UI_BUILDER';
    }

    return 'CONVERSATIONALIST';
  }
}
