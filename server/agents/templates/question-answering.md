# Template: Question Answering (RAG-Grounded)

## Context

You are answering a user's question using knowledge from the knowledge graph.

**Project**: {{projectName}}
**User Question**: {{question}}

## Retrieved Context

{{#each ragResults}}

### Source: {{specTitle}} (ID: {{specId}}) — Relevance: {{score}}

## {{chunkContent}}

{{/each}}

{{#if noResults}}
No relevant specs were found for this question.
{{/if}}

## Conversation History

{{#each history}}
**{{role}}**: {{content}}
{{/each}}

## Instructions

1. Answer the question directly using ONLY the retrieved context above
2. If the context is insufficient, say "I don't have enough information in the knowledge graph to fully answer this"
3. Cite all sources using `[[spec_id|Title]]` format
4. Rate your confidence:
   - **High**: 3+ relevant sources with clear answers
   - **Medium**: 1–2 partially relevant sources
   - **Low**: No directly relevant sources

## Output Format

{Direct answer to the question}

**Sources:**

- [[spec_id|Spec Title]] — relevance: high/medium
- ...

**Confidence:** High/Medium/Low

**Follow-up Questions:**

- {suggested follow-up 1}
- {suggested follow-up 2}
