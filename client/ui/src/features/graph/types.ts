import type { EdgeType } from '@kg/shared';

export interface GraphNodeData {
  id: string;
  title: string;
  summary: string;
  documentId: string;
  status: string;
  depth: number;
  x: number;
  y: number;
}

export interface GraphEdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
}

export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
}

export interface LayoutResult {
  nodes: GraphNodeData[];
  width: number;
  height: number;
}

export interface EdgeTypeConfig {
  type: EdgeType;
  label: string;
  color: string;
  dashed?: boolean;
}
