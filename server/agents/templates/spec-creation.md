# Template: Spec Creation

## Context

You are creating a new spec for the knowledge graph.

**Project**: {{projectName}}
**User Request**: {{userRequest}}

## Existing Related Specs

{{#if relatedSpecs}}
{{#each relatedSpecs}}

- **{{title}}** (ID: {{id}}) — {{summary}}
  {{/each}}
  {{/if}}
  {{#if noRelatedSpecs}}
  No closely related specs found.
  {{/if}}

## Instructions

1. Review the related specs above to avoid duplication
2. Create the spec with the following structure:
   - **Title**: Concise, descriptive, unique within the project
   - **Content**: Well-structured Markdown covering the topic thoroughly
   - **Tags**: Use existing project tags when applicable
   - **Status**: `draft` unless the user explicitly confirms the content
   - **Summary**: 1–2 sentences describing the spec's purpose
3. After creating the spec, suggest 2–3 edges to related specs

## Output Format

Propose the spec for user approval before creating:

```
**Proposed Spec:**
- Title: {title}
- Tags: {tags}
- Status: draft

**Content:**
{markdown content}

**Suggested Edges:**
- {this spec} → depends_on → {related spec title}
- {this spec} → related_to → {related spec title}
```
