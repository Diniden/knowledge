import { nanoid } from 'nanoid';

export function generateId(size?: number): string {
  return nanoid(size);
}

export function generateSpecId(): string {
  return `spec_${nanoid(16)}`;
}

export function generateEdgeId(): string {
  return `edge_${nanoid(16)}`;
}

export function generateDocumentId(): string {
  return `doc_${nanoid(16)}`;
}

export function generateSessionId(): string {
  return `sess_${nanoid(16)}`;
}

export function generatePlanId(): string {
  return `plan_${nanoid(16)}`;
}
