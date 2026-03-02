export interface AgentPromptContext {
  projectName?: string;
  currentSpec?: { id: string; title: string; content: string };
  relatedSpecs?: Array<{ id: string; title: string; summary: string }>;
  graphContext?: { nodes: number; edges: number };
  ragResults?: Array<{ specId: string; content: string; score: number }>;
  userHistory?: Array<{ role: string; content: string }>;
  availableTools?: string[];
}

const SYSTEM_PROMPTS: Record<string, (ctx: AgentPromptContext) => string> = {
  CONVERSATIONALIST: (
    ctx,
  ) => `You are a helpful knowledge assistant for${ctx.projectName ? ` the "${ctx.projectName}" project` : ' a knowledge graph project'}.
You answer questions about the project's knowledge base, explain relationships between specs, and help users understand the graph structure.
Use RAG search for factual answers. Reference specific specs by title and ID. Be concise and helpful.
When unsure, ask for clarification. Cite sources explicitly.`,

  KNOWLEDGE_WRITER: (
    ctx,
  ) => `You are a knowledge graph specialist for${ctx.projectName ? ` the "${ctx.projectName}" project` : ' a knowledge graph project'}.
You manage specs (nodes), edges (relationships), and documents in the knowledge graph.
You can create, update, and delete specs and edges. Use RAG search to find related content before creating new specs.
When suggesting edges, explain the rationale for the relationship type chosen.
Always confirm destructive operations with the user before proceeding.`,

  GRAPH_CRAWLER: (
    ctx,
  ) => `You are a graph analysis specialist for${ctx.projectName ? ` the "${ctx.projectName}" project` : ' a knowledge graph project'}.
You crawl the knowledge graph to discover implications, contradictions, orphan nodes, and quality issues.
When you find issues, create inquiries for human review rather than modifying specs directly.
Focus on semantic consistency between connected specs.`,

  PLAN_GENERATOR: (
    ctx,
  ) => `You are a plan generation specialist for${ctx.projectName ? ` the "${ctx.projectName}" project` : ' a knowledge graph project'}.
You traverse the knowledge graph and produce step-by-step execution plans.
Plans should reference source specs and include clear dependencies between steps.
Support both full build plans and delta plans (changes since last generation).`,

  GEN_UI_BUILDER: (
    ctx,
  ) => `You are a UI generation specialist for${ctx.projectName ? ` the "${ctx.projectName}" project` : ' a knowledge graph project'}.
You create React components and small ESM applications for visualizing knowledge graph data.
Generated UI must be responsive, accessible, and follow modern React best practices.
No external API calls are allowed in generated code. Use only whitelisted packages.`,

  KNOWLEDGE_GRAPH: (
    ctx,
  ) => `You are a knowledge graph specialist for${ctx.projectName ? ` the "${ctx.projectName}" project` : ' a knowledge graph project'}.
You have full read and write access to the knowledge graph.
You can query graph structure, find paths, and analyze subgraphs.
When performing mutations, use dry-run first and confirm with the user.`,

  DIALOG: (
    ctx,
  ) => `You are a helpful knowledge assistant for${ctx.projectName ? ` the "${ctx.projectName}" project` : ' a knowledge graph project'}.
You have read-only access to the knowledge graph. You answer questions and explain relationships.
Reference specs using [[specId|Title]] format. Include a Sources section in your responses.`,
};

export class PromptBuilder {
  static buildSystemPrompt(
    agentType: string,
    context: AgentPromptContext,
  ): string {
    const builder = SYSTEM_PROMPTS[agentType];

    if (!builder) {
      return SYSTEM_PROMPTS['CONVERSATIONALIST']!(context);
    }

    return builder(context);
  }

  static buildContextMessage(context: AgentPromptContext): string {
    const sections: string[] = [];

    if (context.projectName) {
      sections.push(`--- PROJECT ---\nProject: ${context.projectName}`);
    }

    if (context.currentSpec) {
      sections.push(
        `--- CURRENT SPEC ---\nID: ${context.currentSpec.id}\nTitle: ${context.currentSpec.title}\n\n${context.currentSpec.content}`,
      );
    }

    if (context.relatedSpecs && context.relatedSpecs.length > 0) {
      const specList = context.relatedSpecs
        .map((s) => `- [${s.id}] ${s.title}: ${s.summary}`)
        .join('\n');
      sections.push(`--- RELATED SPECS ---\n${specList}`);
    }

    if (context.graphContext) {
      sections.push(
        `--- GRAPH ---\nNodes: ${context.graphContext.nodes}, Edges: ${context.graphContext.edges}`,
      );
    }

    if (context.ragResults && context.ragResults.length > 0) {
      const ragList = context.ragResults
        .map(
          (r) =>
            `- [${r.specId}] (score: ${r.score.toFixed(2)}): ${r.content.slice(0, 200)}`,
        )
        .join('\n');
      sections.push(`--- RAG RESULTS ---\n${ragList}`);
    }

    if (context.userHistory && context.userHistory.length > 0) {
      const historyLines = context.userHistory
        .slice(-10)
        .map((h) => `${h.role}: ${h.content}`)
        .join('\n');
      sections.push(`--- CONVERSATION ---\n${historyLines}`);
    }

    if (context.availableTools && context.availableTools.length > 0) {
      sections.push(
        `--- AVAILABLE TOOLS ---\n${context.availableTools.join(', ')}`,
      );
    }

    return sections.join('\n\n');
  }

  static buildToolResultMessage(toolName: string, result: string): string {
    return `Tool "${toolName}" returned:\n${result}`;
  }
}
