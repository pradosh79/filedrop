import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: parseInt(config.get<string>('DB_PORT', '3306'), 10),
  username: config.get<string>('DB_USER', 'cfup'),
  password: config.get<string>('DB_PASSWORD', 'cfup_password'),
  database: config.get<string>('DB_NAME', 'cfup'),
  autoLoadEntities: true,
  // In production, never auto-sync — use migrations instead
  synchronize: config.get<string>('NODE_ENV') !== 'production',
  logging: config.get<string>('NODE_ENV') === 'development',
  charset: 'utf8mb4',
  timezone: 'Z',
  // Retry DB connection on startup — prevents crash if DB is slow to start
  retryAttempts: 10,
  retryDelay: 3000,
  extra: {
    connectionLimit: 10,
    connectTimeout: 30_000,
    acquireTimeout: 30_000,
  },
});
