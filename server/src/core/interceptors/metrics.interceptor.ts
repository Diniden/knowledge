import { Injectable } from '@nestjs/common';
import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';

export interface MetricsSnapshot {
  requestCounts: Record<string, number>;
  responseTimeAvg: number;
  responseTimeP95: number;
  totalRequests: number;
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private requestCounts = new Map<string, number>();
  private responseTimes: number[] = [];

  private static readonly MAX_STORED_TIMES = 10_000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = (request as { method?: string }).method ?? 'UNKNOWN';
    const routePath =
      (request as { route?: { path?: string } }).route?.path ??
      (request as { url?: string }).url ??
      'unknown';
    const route = `${method} ${routePath}`;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.requestCounts.set(route, (this.requestCounts.get(route) ?? 0) + 1);

        this.responseTimes.push(duration);
        if (this.responseTimes.length > MetricsInterceptor.MAX_STORED_TIMES) {
          this.responseTimes = this.responseTimes.slice(
            -MetricsInterceptor.MAX_STORED_TIMES,
          );
        }
      }),
    );
  }

  getMetrics(): MetricsSnapshot {
    const total = this.responseTimes.length;
    const avg =
      total > 0 ? this.responseTimes.reduce((a, b) => a + b, 0) / total : 0;

    return {
      requestCounts: Object.fromEntries(this.requestCounts),
      responseTimeAvg: Math.round(avg * 100) / 100,
      responseTimeP95: this.getPercentile(95),
      totalRequests: total,
    };
  }

  private getPercentile(p: number): number {
    if (this.responseTimes.length === 0) return 0;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }
}
