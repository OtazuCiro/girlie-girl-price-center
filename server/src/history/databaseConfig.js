export class DatabaseConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export function resolveDatabaseConfig(environment = process.env) {
  const connectionString = environment.DATABASE_URL;
  if (!connectionString) return { enabled: false };

  const vercelEnvironment = environment.VERCEL_ENV ?? "development";
  const expectedRole =
    vercelEnvironment === "production"
      ? "production"
      : vercelEnvironment === "preview"
        ? "preview"
        : "development";
  const configuredRole = environment.PRICE_HISTORY_DATABASE_ROLE;

  if (configuredRole !== expectedRole) {
    throw new DatabaseConfigurationError(
      "Price history database role does not match the runtime environment.",
    );
  }

  return {
    enabled: true,
    connectionString,
    role: configuredRole,
  };
}
