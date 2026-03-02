import { EdgeType } from '@kg/shared';
import type { GraphNodeData, GraphEdgeData, EdgeTypeConfig } from './types.js';

export const MOCK_NODES: GraphNodeData[] = [
  {
    id: 'spec-arch',
    title: 'Architecture Overview',
    summary:
      'High-level system architecture defining service boundaries and communication patterns.',
    documentId: 'doc-1',
    status: 'approved',
    depth: 0,
    x: 0,
    y: 0,
  },
  {
    id: 'spec-api',
    title: 'API Gateway',
    summary:
      'REST and WebSocket gateway handling authentication, rate limiting, and routing.',
    documentId: 'doc-1',
    status: 'approved',
    depth: 1,
    x: 0,
    y: 0,
  },
  {
    id: 'spec-auth',
    title: 'Auth Service',
    summary:
      'JWT-based authentication with refresh tokens and role-based access control.',
    documentId: 'doc-2',
    status: 'reviewed',
    depth: 1,
    x: 0,
    y: 0,
  },
  {
    id: 'spec-graph',
    title: 'Knowledge Graph Engine',
    summary:
      'Graph database interface for storing and querying spec relationships.',
    documentId: 'doc-1',
    status: 'draft',
    depth: 1,
    x: 0,
    y: 0,
  },
  {
    id: 'spec-agent',
    title: 'Agent Orchestrator',
    summary:
      'Multi-agent system coordinating LLM calls, tool use, and result synthesis.',
    documentId: 'doc-3',
    status: 'draft',
    depth: 2,
    x: 0,
    y: 0,
  },
  {
    id: 'spec-ui',
    title: 'Frontend Shell',
    summary:
      'React SPA shell with layout, routing, and shared component library.',
    documentId: 'doc-2',
    status: 'approved',
    depth: 2,
    x: 0,
    y: 0,
  },
  {
    id: 'spec-ws',
    title: 'WebSocket Protocol',
    summary:
      'Real-time messaging protocol for live updates and agent streaming.',
    documentId: 'doc-1',
    status: 'reviewed',
    depth: 2,
    x: 0,
    y: 0,
  },
  {
    id: 'spec-storage',
    title: 'Storage Layer',
    summary:
      'File storage abstraction supporting local FS and S3-compatible backends.',
    documentId: 'doc-3',
    status: 'draft',
    depth: 3,
    x: 0,
    y: 0,
  },
];

export const MOCK_EDGES: GraphEdgeData[] = [
  {
    id: 'edge-1',
    sourceId: 'spec-arch',
    targetId: 'spec-api',
    type: EdgeType.DERIVED_FROM,
  },
  {
    id: 'edge-2',
    sourceId: 'spec-arch',
    targetId: 'spec-auth',
    type: EdgeType.DERIVED_FROM,
  },
  {
    id: 'edge-3',
    sourceId: 'spec-arch',
    targetId: 'spec-graph',
    type: EdgeType.DERIVED_FROM,
  },
  {
    id: 'edge-4',
    sourceId: 'spec-api',
    targetId: 'spec-agent',
    type: EdgeType.DEPENDS_ON,
  },
  {
    id: 'edge-5',
    sourceId: 'spec-api',
    targetId: 'spec-ui',
    type: EdgeType.RELATED_TO,
  },
  {
    id: 'edge-6',
    sourceId: 'spec-api',
    targetId: 'spec-ws',
    type: EdgeType.DEPENDS_ON,
  },
  {
    id: 'edge-7',
    sourceId: 'spec-graph',
    targetId: 'spec-storage',
    type: EdgeType.DEPENDS_ON,
  },
  {
    id: 'edge-8',
    sourceId: 'spec-agent',
    targetId: 'spec-graph',
    type: EdgeType.DEPENDS_ON,
  },
  {
    id: 'edge-9',
    sourceId: 'spec-ws',
    targetId: 'spec-auth',
    type: EdgeType.DEPENDS_ON,
  },
  {
    id: 'edge-10',
    sourceId: 'spec-storage',
    targetId: 'spec-arch',
    type: EdgeType.CONTRADICTS,
  },
];

export const EDGE_TYPE_CONFIGS: EdgeTypeConfig[] = [
  { type: EdgeType.DERIVED_FROM, label: 'Derived From', color: '#3B82F6' },
  { type: EdgeType.DEPENDS_ON, label: 'Depends On', color: '#F59E0B' },
  {
    type: EdgeType.RELATED_TO,
    label: 'Related To',
    color: '#9CA3AF',
    dashed: true,
  },
  { type: EdgeType.CONTRADICTS, label: 'Contradicts', color: '#EF4444' },
  { type: EdgeType.SUPERSEDES, label: 'Supersedes', color: '#8B5CF6' },
];

export const MOCK_CONTENT = `
<h3>Architecture Overview</h3>
<p>This document describes the high-level architecture of the Knowledge Graph Platform,
including service boundaries, communication patterns, and deployment topology.</p>
<h4>Service Boundaries</h4>
<ul>
  <li><strong>API Gateway</strong> — public-facing HTTP and WebSocket endpoint</li>
  <li><strong>Auth Service</strong> — JWT issuance, token refresh, RBAC</li>
  <li><strong>Graph Engine</strong> — spec storage, relationship traversal</li>
  <li><strong>Agent Orchestrator</strong> — LLM coordination, tool routing</li>
  <li><strong>Storage Layer</strong> — file persistence abstraction</li>
</ul>
<h4>Communication</h4>
<p>Services communicate via internal HTTP (synchronous) and message queues (asynchronous).
The WebSocket gateway provides real-time updates to connected clients.</p>
<pre><code>Client ──▶ API Gateway ──▶ Auth Service
                        ──▶ Graph Engine
                        ──▶ Agent Orchestrator</code></pre>
`;
