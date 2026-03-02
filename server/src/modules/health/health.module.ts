import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { MetricsInterceptor } from '../../core/interceptors/metrics.interceptor.js';

@Module({
  controllers: [HealthController],
  providers: [MetricsInterceptor],
  exports: [MetricsInterceptor],
})
export class HealthModule {}
