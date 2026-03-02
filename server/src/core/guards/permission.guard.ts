import { Injectable, SetMetadata } from '@nestjs/common';
import type { ExecutionContext, CanActivate } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { type PermissionsService } from '../../modules/collaboration/permissions.service.js';
import type { PermissionLevel } from '@kg/shared';

const REQUIRED_PERMISSION_KEY = 'requiredPermission';

export const RequirePermission = (level: PermissionLevel) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, level);

interface AuthenticatedRequest extends Request {
  user?: { sub?: string };
  params: Record<string, string>;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLevel = this.reflector.get<PermissionLevel | undefined>(
      REQUIRED_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredLevel) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const specId = request.params['specId'] ?? request.params['id'];

    if (!specId) {
      throw new ForbiddenException('Spec ID is required');
    }

    const hasPermission = await this.permissionsService.checkPermission(
      userId,
      specId,
      requiredLevel,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permission');
    }

    return true;
  }
}
