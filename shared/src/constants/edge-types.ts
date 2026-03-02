import { EdgeType } from '../types/edge.js';

export const EDGE_TYPES = Object.values(EdgeType);

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: 'Derived From',
  [EdgeType.DEPENDS_ON]: 'Depends On',
  [EdgeType.RELATED_TO]: 'Related To',
  [EdgeType.CONTRADICTS]: 'Contradicts',
  [EdgeType.SUPERSEDES]: 'Supersedes',
};

export const EDGE_TYPE_DESCRIPTIONS: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: 'Spec B was created by refining or extending Spec A',
  [EdgeType.DEPENDS_ON]: 'Spec B cannot be fulfilled without Spec A',
  [EdgeType.RELATED_TO]: 'Specs are conceptually related',
  [EdgeType.CONTRADICTS]: 'Specs conflict with each other',
  [EdgeType.SUPERSEDES]: 'Spec B replaces or supersedes Spec A',
};
