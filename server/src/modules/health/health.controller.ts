import {
  Controller,
  Get,
  Inject,
  Optional,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../core/guards/jwt-auth.guard.js';
import { MetricsInterceptor } from '../../core/interceptors/metrics.interceptor.js';
import type { MetricsSnapshot } from '../../core/interceptors/metrics.interceptor.js';
import { DRIZZLE } from '../database/database.module.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Optional()
    @Inject(MetricsInterceptor)
    private readonly metricsInterceptor?: MetricsInterceptor,
    @Optional()
    @Inject(DRIZZLE)
    private readonly db?: unknown,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness check with system info' })
  @ApiResponse({ status: 200, description: 'Server is alive' })
  check() {
    const mem = process.memoryUsage();
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.1.0',
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
      },
    };
  }

  @Get('ready')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness check — verifies dependencies' })
  @ApiResponse({ status: 200, description: 'Server is ready' })
  @ApiResponse({ status: 503, description: 'Server is not ready' })
  async ready() {
    const checks: Record<string, 'ok' | 'fail'> = {
      server: 'ok',
      database: 'fail',
    };

    try {
      if (this.db) {
        const dbAny = this.db as {
          execute?: (sql: unknown) => Promise<unknown>;
        };
        if (typeof dbAny.execute === 'function') {
          await dbAny.execute({ sql: 'SELECT 1' });
        }
        checks['database'] = 'ok';
      }
    } catch {
      checks['database'] = 'fail';
    }

    const allHealthy = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Get('metrics')
  @Public()
  @ApiOperation({ summary: 'Application metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  getMetrics(): MetricsSnapshot {
    if (!this.metricsInterceptor) {
      return {
        requestCounts: {},
        responseTimeAvg: 0,
        responseTimeP95: 0,
        totalRequests: 0,
      };
    }

    return this.metricsInterceptor.getMetrics();
  }
}
