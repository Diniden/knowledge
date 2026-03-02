import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('DatabaseModule');

        try {
          const databaseUrl = config.get<string>('DATABASE_URL');
          let sql: postgres.Sql;

          if (databaseUrl) {
            sql = postgres(databaseUrl);
          } else {
            sql = postgres({
              host: config.get<string>('DATABASE_HOST', 'localhost'),
              port: config.get<number>('DATABASE_PORT', 5432),
              database: config.get<string>('DATABASE_NAME', 'kg_dev'),
              user: config.get<string>('DATABASE_USER', 'kg_user'),
              password: config.get<string>('DATABASE_PASSWORD', 'changeme'),
            });
          }

          const db = drizzle(sql, { schema });
          logger.log('Drizzle ORM connection established');
          return db;
        } catch (error) {
          logger.error('Failed to establish database connection', error);
          throw error;
        }
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
