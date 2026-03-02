# Template: Graph Analysis

## Context

You are analyzing the knowledge graph structure to find issues and improvement opportunities.

**Project**: {{projectName}}
**Analysis Scope**: {{scope}}
**Trigger**: {{trigger}}

## Graph Snapshot

- Total specs: {{graphStats.specCount}}
- Total edges: {{graphStats.edgeCount}}
- Total documents: {{graphStats.documentCount}}

## Target Specs

{{#each targetSpecs}}

### {{title}} (ID: {{id}})

- Status: {{status}}
- Tags: {{tags}}
- Edges: {{edgeCount}} outgoing, {{incomingEdgeCount}} incoming
- Last updated: {{updatedAt}}
  {{/each}}

## Analysis Checklist

For each spec, evaluate:

1. **Contradictions**: Does this spec conflict with any connected specs?
2. **Orphan status**: Does the spec have sufficient connections?
3. **Content freshness**: Has the spec been updated recently enough?
4. **Metadata completeness**: Are tags, summary, and status set?
5. **Missing edges**: Should this spec be connected to others that it isn't?
6. **Quality**: Is the content clear, structured, and sufficient?

## Output Format

```
## Analysis Results

### Critical Issues
- [{severity}] {issue title} — {affected spec}
  {description and recommended action}

### Warnings
- [{severity}] {issue title} — {affected spec}
  {description and recommended action}

### Informational
- [{severity}] {issue title} — {affected spec}
  {description}

### Summary
- Specs analyzed: {count}
- Issues found: {count by severity}
- Recommended actions: {prioritized list}
```
