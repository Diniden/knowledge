export enum EdgeType {
  DERIVED_FROM = 'DERIVED_FROM',
  DEPENDS_ON = 'DEPENDS_ON',
  RELATED_TO = 'RELATED_TO',
  CONTRADICTS = 'CONTRADICTS',
  SUPERSEDES = 'SUPERSEDES',
}

export interface Edge {
  id: string;
  sourceSpecId: string;
  targetSpecId: string;
  type: EdgeType;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  commitHash: string;
}
