import type { GraphQuery, GraphResponse, GraphNode } from '@kg/shared';
import { GRAPH_ROUTES } from '@kg/shared';
import { apiClient } from './client';

export const graphApi = {
  query: (params: GraphQuery) =>
    apiClient.post<GraphResponse>(GRAPH_ROUTES.QUERY, params),

  neighbors: (specId: string) =>
    apiClient.get<GraphNode[]>(GRAPH_ROUTES.NEIGHBORS(specId)),

  findPath: (fromId: string, toId: string) =>
    apiClient.post<GraphNode[]>(GRAPH_ROUTES.PATH, { fromId, toId }),

  search: (term: string) =>
    apiClient.get<GraphNode[]>(
      `${GRAPH_ROUTES.SEARCH}?q=${encodeURIComponent(term)}`,
    ),
};
