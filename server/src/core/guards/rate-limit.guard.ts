import { Injectable, SetMetadata } from '@nestjs/common';
import type { ExecutionContext, CanActivate } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

const RATE_LIMIT_KEY = 'rateLimit';
const RATE_LIMIT_WINDOW_KEY = 'rateLimitWindow';

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_MS = 60_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export const RateLimit = (limit: number, windowMs?: number) => {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    SetMetadata(RATE_LIMIT_KEY, limit)(target, propertyKey, descriptor);
    SetMetadata(RATE_LIMIT_WINDOW_KEY, windowMs ?? DEFAULT_WINDOW_MS)(
      target,
      propertyKey,
      descriptor,
    );
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requestCounts = new Map<string, RateLimitEntry>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const limit =
      this.reflector.get<number>(RATE_LIMIT_KEY, context.getHandler()) ??
      DEFAULT_LIMIT;
    const windowMs =
      this.reflector.get<number>(RATE_LIMIT_WINDOW_KEY, context.getHandler()) ??
      DEFAULT_WINDOW_MS;

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.extractKey(request);
    const now = Date.now();

    const entry = this.requestCounts.get(key);

    if (!entry || now >= entry.resetAt) {
      this.requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count++;

    if (entry.count > limit) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          retryAfter: retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private extractKey(request: Request): string {
    const userId = (request as Request & { user?: { sub?: string } }).user?.sub;
    if (userId) return `user:${userId}`;

    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined) ??
      request.ip ??
      'unknown';
    return `ip:${ip}`;
  }
}
