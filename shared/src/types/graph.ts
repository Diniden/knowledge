import type { Edge } from './edge.js';
import type { Spec } from './spec.js';

export interface GraphNode {
  spec: Spec;
  positionHints?: { x: number; y: number };
  displayState?: 'expanded' | 'collapsed';
}

export interface GraphQuery {
  specIds?: string[];
  edgeTypes?: string[];
  depth?: number;
  includeOrphans?: boolean;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: Edge[];
}

export interface InquiryQueueItem {
  id: string;
  type: 'edge-issue' | 'node-issue' | 'conflict' | 'suggestion';
  description: string;
  relatedSpecIds: string[];
  relatedEdgeIds: string[];
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
}
