import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get('DB_HOST', 'localhost'),
  port: parseInt(config.get('DB_PORT', '3306'), 10),
  username: config.get('DB_USER', 'cfup'),
  password: config.get('DB_PASSWORD', 'cfup_password'),
  database: config.get('DB_NAME', 'cfup'),
  autoLoadEntities: true,
  synchronize: config.get('NODE_ENV') !== 'production',
  logging: config.get('NODE_ENV') === 'development',
  charset: 'utf8mb4',
  timezone: 'Z',
  extra: {
    connectionLimit: 10,
    connectTimeout: 30_000,
    acquireTimeout: 30_000,
  },
});
