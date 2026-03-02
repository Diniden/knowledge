import type { PermissionLevel } from './permissions.js';

export interface MediaRef {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  path: string;
  originalName: string;
}

export interface Spec {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  commitHash: string;
  tags: string[];
  permissionLevel: PermissionLevel;
  summary?: string;
  documentId: string;
  mediaAssociations: MediaRef[];
}

export interface SpecDocument {
  id: string;
  title: string;
  description: string;
  specIds: string[];
  authorId: string;
  createdAt: string;
  updatedAt: string;
  commitHash: string;
}
