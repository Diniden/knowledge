import { EdgeType } from '../types/edge.js';

export const EDGE_TYPES: EdgeType[] = Object.values(EdgeType);

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: 'Derived From',
  [EdgeType.DEPENDS_ON]: 'Depends On',
  [EdgeType.RELATED_TO]: 'Related To',
  [EdgeType.CONTRADICTS]: 'Contradicts',
  [EdgeType.SUPERSEDES]: 'Supersedes',
} as const;

export const EDGE_TYPE_DESCRIPTIONS: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: 'This spec was derived from the target spec',
  [EdgeType.DEPENDS_ON]: 'This spec depends on the target spec',
  [EdgeType.RELATED_TO]: 'This spec is related to the target spec',
  [EdgeType.CONTRADICTS]: 'This spec contradicts the target spec',
  [EdgeType.SUPERSEDES]: 'This spec supersedes the target spec',
} as const;

export interface EdgeTypeDescriptor {
  value: EdgeType;
  label: string;
  description: string;
}

export const EDGE_TYPE_DESCRIPTORS: Record<EdgeType, EdgeTypeDescriptor> = {
  [EdgeType.DERIVED_FROM]: {
    value: EdgeType.DERIVED_FROM,
    label: EDGE_TYPE_LABELS[EdgeType.DERIVED_FROM],
    description: EDGE_TYPE_DESCRIPTIONS[EdgeType.DERIVED_FROM],
  },
  [EdgeType.DEPENDS_ON]: {
    value: EdgeType.DEPENDS_ON,
    label: EDGE_TYPE_LABELS[EdgeType.DEPENDS_ON],
    description: EDGE_TYPE_DESCRIPTIONS[EdgeType.DEPENDS_ON],
  },
  [EdgeType.RELATED_TO]: {
    value: EdgeType.RELATED_TO,
    label: EDGE_TYPE_LABELS[EdgeType.RELATED_TO],
    description: EDGE_TYPE_DESCRIPTIONS[EdgeType.RELATED_TO],
  },
  [EdgeType.CONTRADICTS]: {
    value: EdgeType.CONTRADICTS,
    label: EDGE_TYPE_LABELS[EdgeType.CONTRADICTS],
    description: EDGE_TYPE_DESCRIPTIONS[EdgeType.CONTRADICTS],
  },
  [EdgeType.SUPERSEDES]: {
    value: EdgeType.SUPERSEDES,
    label: EDGE_TYPE_LABELS[EdgeType.SUPERSEDES],
    description: EDGE_TYPE_DESCRIPTIONS[EdgeType.SUPERSEDES],
  },
} as const;
