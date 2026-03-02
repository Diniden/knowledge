# Template: Edge Suggestion

## Context

You are analyzing specs to suggest edges (relationships) between them.

**Source Spec**: {{sourceSpec.title}} (ID: {{sourceSpec.id}})
**Source Content Summary**: {{sourceSpec.summary}}

**Candidate Specs**:
{{#each candidates}}

- **{{title}}** (ID: {{id}}) — {{summary}}
  {{/each}}

## Edge Type Decision Guide

- **depends_on**: Source requires the target to be true or complete
- **derived_from**: Source was created based on or references the target
- **related_to**: Source and target share a topic or domain
- **contradicts**: Source and target make conflicting claims
- **supersedes**: Source replaces or updates the target

## Confidence Scoring

- 0.9–1.0: Explicit, obvious relationship stated in content
- 0.7–0.9: Strong implicit relationship inferred from context
- 0.5–0.7: Moderate relationship, may need human confirmation
- Below 0.5: Do not suggest — too speculative

## Output Format

```
**Suggested Edges:**
1. {{sourceSpec.title}} → {edge_type} → {target title}
   Confidence: {score} | Rationale: {brief explanation}

2. ...
```
