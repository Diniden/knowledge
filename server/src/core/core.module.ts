import { Module, Global } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { TransformInterceptor } from './interceptors/transform.interceptor.js';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor.js';
import { RequestIdMiddleware } from './middleware/request-id.middleware.js';
import { CspMiddleware } from './middleware/csp.middleware.js';
import { SanitizationService } from './services/sanitization.service.js';
import { RateLimitGuard } from './guards/rate-limit.guard.js';

@Global()
@Module({
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    SanitizationService,
    RateLimitGuard,
  ],
  exports: [SanitizationService, RateLimitGuard],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, CspMiddleware).forRoutes('*path');
  }
}
