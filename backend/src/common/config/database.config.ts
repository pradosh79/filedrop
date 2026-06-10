import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Parse Railway's MYSQL_URL or DATABASE_URL connection string.
 * Format: mysql://user:password@host:port/database
 */
function parseMysqlUrl(url: string): Partial<TypeOrmModuleOptions> {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port || '3306', 10),
      username: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  } catch {
    return {};
  }
}

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => {
  // Railway provides MYSQL_URL or DATABASE_URL — check these first
  const mysqlUrl =
    config.get<string>('MYSQL_URL') ||
    config.get<string>('DATABASE_URL') ||
    config.get<string>('MYSQLURL');

  const fromUrl = mysqlUrl ? parseMysqlUrl(mysqlUrl) : {};

  return {
    type: 'mysql',
    // URL takes priority; individual vars are fallback
    host:     (fromUrl.host     as string) || config.get('DB_HOST',     'localhost'),
    port:     (fromUrl.port     as number) || parseInt(config.get('DB_PORT', '3306'), 10),
    username: (fromUrl.username as string) || config.get('DB_USER',     'cfup'),
    password: (fromUrl.password as string) || config.get('DB_PASSWORD', 'cfup_password'),
    database: (fromUrl.database as string) || config.get('DB_NAME',     'cfup'),
    autoLoadEntities: true,
    synchronize: config.get<string>('NODE_ENV') !== 'production',
    logging: false,
    charset: 'utf8mb4',
    timezone: 'Z',
    retryAttempts: 20,
    retryDelay: 3000,
    extra: {
      connectionLimit: 10,
      connectTimeout: 30_000,
    },
  } as TypeOrmModuleOptions;
};
