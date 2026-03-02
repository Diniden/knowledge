import { configuration } from './configuration';

export function getDatabaseConfig() {
  const config = configuration();
  return {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
  };
}

export function getDatabaseUrl(): string {
  const config = configuration();
  const { user, password, host, port, name } = config.database;
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
