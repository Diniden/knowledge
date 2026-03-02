export function validate(config: Record<string, unknown>) {
  const errors: string[] = [];

  if (!config['DATABASE_HOST'] && !config['DATABASE_URL']) {
    errors.push('DATABASE_HOST or DATABASE_URL is required');
  }

  if (
    config['NODE_ENV'] === 'production' &&
    config['JWT_SECRET'] === 'dev-secret-change-me'
  ) {
    errors.push('JWT_SECRET must be changed in production');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }

  return config;
}
