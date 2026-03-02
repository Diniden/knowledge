import { makeObservable, observable, action, computed } from 'mobx';
import type { GraphNode, Edge, GraphQuery } from '@kg/shared';

export class GraphStore {
  nodes: Map<string, GraphNode> = new Map();
  edges: Map<string, Edge> = new Map();
  selectedNodeId: string | null = null;
  loading = false;
  currentQuery: GraphQuery | null = null;

  constructor() {
    makeObservable(this, {
      nodes: observable,
      edges: observable,
      selectedNodeId: observable,
      loading: observable,
      currentQuery: observable,
      selectedNode: computed,
      nodeList: computed,
      edgeList: computed,
      setLoading: action.bound,
      selectNode: action.bound,
      setNodes: action.bound,
      setEdges: action.bound,
      setCurrentQuery: action.bound,
    });
  }

  get selectedNode(): GraphNode | undefined {
    return this.selectedNodeId
      ? this.nodes.get(this.selectedNodeId)
      : undefined;
  }

  get nodeList(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  get edgeList(): Edge[] {
    return Array.from(this.edges.values());
  }

  setLoading(loading: boolean) {
    this.loading = loading;
  }

  selectNode(id: string | null) {
    this.selectedNodeId = id;
  }

  setNodes(nodes: GraphNode[]) {
    this.nodes.clear();
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
  }

  setEdges(edges: Edge[]) {
    this.edges.clear();
    for (const edge of edges) {
      this.edges.set(edge.id, edge);
    }
  }

  setCurrentQuery(query: GraphQuery | null) {
    this.currentQuery = query;
  }
}
