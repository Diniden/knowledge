import { Injectable } from '@nestjs/common';
import { PermissionLevel } from '@kg/shared';

interface StoredGrant {
  specId: string;
  userId: string;
  level: PermissionLevel;
  grantedBy: string;
  grantedAt: string;
}

interface ShareToken {
  token: string;
  specId: string;
  level: PermissionLevel;
  expiresAt: number;
}

@Injectable()
export class PermissionsService {
  private grants = new Map<string, StoredGrant>();
  private shareTokens = new Map<string, ShareToken>();

  async checkPermission(
    userId: string,
    specId: string,
    requiredLevel: PermissionLevel,
  ): Promise<boolean> {
    const userLevel = await this.getPermissionLevel(userId, specId);

    if (requiredLevel === PermissionLevel.SUMMARY_ACCESS) {
      return true;
    }

    return userLevel === PermissionLevel.FULL_ACCESS;
  }

  async getPermissionLevel(
    userId: string,
    specId: string,
  ): Promise<PermissionLevel> {
    const key = `${specId}:${userId}`;
    const grant = this.grants.get(key);

    if (grant) {
      return grant.level;
    }

    return PermissionLevel.FULL_ACCESS;
  }

  async grantPermission(
    specId: string,
    userId: string,
    level: PermissionLevel,
    grantedBy: string,
  ): Promise<void> {
    const key = `${specId}:${userId}`;
    this.grants.set(key, {
      specId,
      userId,
      level,
      grantedBy,
      grantedAt: new Date().toISOString(),
    });
  }

  async revokePermission(specId: string, userId: string): Promise<void> {
    const key = `${specId}:${userId}`;
    this.grants.delete(key);
  }

  async generateShareToken(
    specId: string,
    level: PermissionLevel,
    expiresIn?: number,
  ): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + (expiresIn ?? 7 * 24 * 60 * 60 * 1000);

    this.shareTokens.set(token, { token, specId, level, expiresAt });
    return token;
  }

  async validateShareToken(
    token: string,
  ): Promise<{ specId: string; level: PermissionLevel } | null> {
    const stored = this.shareTokens.get(token);

    if (!stored) return null;
    if (Date.now() > stored.expiresAt) {
      this.shareTokens.delete(token);
      return null;
    }

    return { specId: stored.specId, level: stored.level };
  }
}
