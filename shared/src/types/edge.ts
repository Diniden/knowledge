export enum EdgeType {
  DERIVED_FROM = 'DERIVED_FROM',
  DEPENDS_ON = 'DEPENDS_ON',
  RELATED_TO = 'RELATED_TO',
  CONTRADICTS = 'CONTRADICTS',
  SUPERSEDES = 'SUPERSEDES',
}

export interface EdgeMetadata {
  description?: string;
  weight?: number;
  tags?: string[];
  [key: string]: unknown;
}

export interface Edge {
  id: string;
  sourceSpecId: string;
  targetSpecId: string;
  type: EdgeType;
  metadata: EdgeMetadata;
  createdAt: string;
  createdBy: string;
  commitHash: string;
}

export interface CreateEdgeRequest {
  sourceSpecId: string;
  targetSpecId: string;
  type: EdgeType;
  metadata?: Record<string, unknown>;
}

export interface UpdateEdgeRequest {
  type?: EdgeType;
  metadata?: Record<string, unknown>;
}
