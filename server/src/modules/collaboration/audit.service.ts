import { Injectable } from '@nestjs/common';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private logs: AuditEntry[] = [];

  async log(entry: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    this.logs.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  async query(options: {
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    since?: Date;
    until?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditEntry[]> {
    let results = this.logs;

    if (options.userId) {
      results = results.filter((e) => e.userId === options.userId);
    }
    if (options.action) {
      results = results.filter((e) => e.action === options.action);
    }
    if (options.resourceType) {
      results = results.filter((e) => e.resourceType === options.resourceType);
    }
    if (options.resourceId) {
      results = results.filter((e) => e.resourceId === options.resourceId);
    }
    if (options.since) {
      const since = options.since.toISOString();
      results = results.filter((e) => e.timestamp >= since);
    }
    if (options.until) {
      const until = options.until.toISOString();
      results = results.filter((e) => e.timestamp <= until);
    }

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    return results.slice(offset, offset + limit);
  }
}
