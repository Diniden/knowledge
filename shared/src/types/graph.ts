import type { Edge, EdgeType } from './edge.js';
import type { Spec } from './spec.js';

export interface GraphNode {
  id: string;
  spec: Spec;
  edges: Edge[];
  depth: number;
  position?: { x: number; y: number };
}

export interface GraphQuery {
  specId?: string;
  depth?: number;
  edgeTypes?: EdgeType[];
  tags?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: Edge[];
  rootNodeId?: string;
  totalNodes: number;
  queryDepth: number;
}

export type InquiryType =
  | 'edge-issue'
  | 'node-issue'
  | 'conflict'
  | 'suggestion';

export type InquiryStatus = 'pending' | 'reviewed' | 'resolved';

export type InquiryPriority = 'critical' | 'important' | 'info';

export interface InquiryQueueItem {
  id: string;
  type: InquiryType;
  description: string;
  relatedSpecIds: string[];
  relatedEdgeIds: string[];
  createdAt: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  resolvedAt?: string;
  resolution?: string;
}

export interface OutgoingEdgeRef {
  edgeId: string;
  targetSpecId: string;
  type: EdgeType;
}

export interface IncomingEdgeRef {
  edgeId: string;
  sourceSpecId: string;
  type: EdgeType;
}

export interface AdjacencyEntry {
  outgoing: OutgoingEdgeRef[];
  incoming: IncomingEdgeRef[];
}

export type AdjacencyMap = Record<string, AdjacencyEntry>;
