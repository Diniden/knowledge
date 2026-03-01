import { EdgeType } from '../types/edge.js';

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: 'Derived From',
  [EdgeType.DEPENDS_ON]: 'Depends On',
  [EdgeType.RELATED_TO]: 'Related To',
  [EdgeType.CONTRADICTS]: 'Contradicts',
  [EdgeType.SUPERSEDES]: 'Supersedes',
};

export const EDGE_TYPE_DESCRIPTIONS: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: 'This spec was derived from or inspired by the target spec.',
  [EdgeType.DEPENDS_ON]: 'This spec has a hard dependency on the target spec being true.',
  [EdgeType.RELATED_TO]: 'This spec is semantically related to the target spec.',
  [EdgeType.CONTRADICTS]: 'This spec is in conflict with or contradicts the target spec.',
  [EdgeType.SUPERSEDES]: 'This spec replaces or supersedes the target spec.',
};

export const ALL_EDGE_TYPES = Object.values(EdgeType);
