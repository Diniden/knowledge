import type { ConfigService } from '@nestjs/config';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import type { AppConfig } from '../../config/configuration.js';

export function getCorsConfig(configService: ConfigService): CorsOptions {
  const corsOrigin =
    configService.get<AppConfig['corsOrigin']>('app.corsOrigin');
  const allowedOrigins = corsOrigin?.split(',').map((o) => o.trim()) ?? [
    'http://localhost:3000',
  ];

  return {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86_400,
  };
}
