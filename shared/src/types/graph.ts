import type { Spec } from './spec.js';
import type { Edge } from './edge.js';

export interface GraphNodePosition {
  x: number;
  y: number;
}

export interface GraphNode {
  spec: Spec;
  position?: GraphNodePosition;
  isExpanded?: boolean;
  isHighlighted?: boolean;
}

export interface GraphQuery {
  rootSpecId?: string;
  depth?: number;
  edgeTypes?: string[];
  tags?: string[];
  limit?: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: Edge[];
  totalNodes: number;
  totalEdges: number;
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
