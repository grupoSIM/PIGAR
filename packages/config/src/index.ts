export type PigarEnvironment = "development" | "production" | "test";
export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export class ConfigurationError extends Error {
  constructor(
    readonly code: "CONFIG_INVALID" | "CONFIG_REQUIRED",
    variable: string,
  ) {
    super(`${code}: ${variable}`);
  }
}

export type ApiConfiguration = {
  auth0?: Auth0Configuration;
  environment: PigarEnvironment;
  host: string;
  mediaRoot?: string;
  port: number;
};

export type Auth0Configuration = {
  adminClientId?: string;
  audience: string;
  issuer: string;
  managementClientId?: string;
  managementClientSecret?: string;
  internalConnection?: string;
};

export type WorkerConfiguration = {
  environment: PigarEnvironment;
  pollIntervalMs: number;
};

export function loadApiConfiguration(environment: EnvironmentVariables): ApiConfiguration {
  const runtimeEnvironment = readEnvironment(environment);
  const host = environment.HOST ?? "127.0.0.1";
  const port = readInteger(environment.PORT ?? "3000", "PORT", 1, 65_535);
  const mediaRoot = optionalValue(environment.MEDIA_ROOT);
  const auth0Issuer = optionalValue(environment.AUTH0_ISSUER);
  const auth0Audience = optionalValue(environment.AUTH0_AUDIENCE);
  const auth0AdminClientId = optionalValue(environment.AUTH0_ADMIN_CLIENT_ID);
  const auth0ManagementClientId = optionalValue(environment.AUTH0_MANAGEMENT_CLIENT_ID);
  const auth0ManagementClientSecret = optionalValue(environment.AUTH0_MANAGEMENT_CLIENT_SECRET);
  const auth0InternalConnection = optionalValue(environment.AUTH0_INTERNAL_CONNECTION);

  if (!/^[a-zA-Z0-9.-]+$/.test(host)) throw new ConfigurationError("CONFIG_INVALID", "HOST");
  if (runtimeEnvironment === "production") {
    requiredValue(environment.DATABASE_URL, "DATABASE_URL");
    requiredValue(mediaRoot, "MEDIA_ROOT");
    requiredValue(auth0Issuer, "AUTH0_ISSUER");
    requiredValue(auth0Audience, "AUTH0_AUDIENCE");
    requiredValue(auth0AdminClientId, "AUTH0_ADMIN_CLIENT_ID");
    requiredValue(auth0ManagementClientId, "AUTH0_MANAGEMENT_CLIENT_ID");
    requiredValue(auth0ManagementClientSecret, "AUTH0_MANAGEMENT_CLIENT_SECRET");
    requiredValue(auth0InternalConnection, "AUTH0_INTERNAL_CONNECTION");
  }

  if ((auth0Issuer && !auth0Audience) || (!auth0Issuer && auth0Audience)) {
    throw new ConfigurationError(
      "CONFIG_REQUIRED",
      auth0Issuer ? "AUTH0_AUDIENCE" : "AUTH0_ISSUER",
    );
  }

  const auth0 =
    auth0Issuer && auth0Audience
      ? validateAuth0(
          auth0Issuer,
          auth0Audience,
          auth0AdminClientId,
          auth0ManagementClientId,
          auth0ManagementClientSecret,
          auth0InternalConnection,
        )
      : undefined;

  return {
    environment: runtimeEnvironment,
    host,
    ...(mediaRoot ? { mediaRoot } : {}),
    ...(auth0 ? { auth0 } : {}),
    port,
  };
}

function validateAuth0(
  issuer: string,
  audience: string,
  adminClientId: string | undefined,
  managementClientId: string | undefined,
  managementClientSecret: string | undefined,
  internalConnection: string | undefined,
): Auth0Configuration {
  if (!/^https:\/\/[^/?#]+(?:\/[^?#]*)?\/$/.test(issuer)) {
    throw new ConfigurationError("CONFIG_INVALID", "AUTH0_ISSUER");
  }
  if (!/^https:\/\/[^/?#]+(?:\/[^?#]*)?$/.test(audience)) {
    throw new ConfigurationError("CONFIG_INVALID", "AUTH0_AUDIENCE");
  }
  if (adminClientId && !/^[A-Za-z0-9_-]{8,128}$/.test(adminClientId)) {
    throw new ConfigurationError("CONFIG_INVALID", "AUTH0_ADMIN_CLIENT_ID");
  }
  return {
    ...(adminClientId ? { adminClientId } : {}),
    ...(managementClientId ? { managementClientId } : {}),
    ...(managementClientSecret ? { managementClientSecret } : {}),
    ...(internalConnection ? { internalConnection } : {}),
    audience,
    issuer,
  };
}

export function loadWorkerConfiguration(environment: EnvironmentVariables): WorkerConfiguration {
  const runtimeEnvironment = readEnvironment(environment);
  if (runtimeEnvironment === "production") requiredValue(environment.DATABASE_URL, "DATABASE_URL");

  return {
    environment: runtimeEnvironment,
    pollIntervalMs: readInteger(
      environment.WORKER_POLL_INTERVAL_MS ?? "30000",
      "WORKER_POLL_INTERVAL_MS",
      1,
      300_000,
    ),
  };
}

function readEnvironment(environment: EnvironmentVariables): PigarEnvironment {
  const value = environment.NODE_ENV ?? "development";
  if (value === "development" || value === "production" || value === "test") return value;
  throw new ConfigurationError("CONFIG_INVALID", "NODE_ENV");
}

function readInteger(value: string, variable: string, minimum: number, maximum: number): number {
  const number = Number.parseInt(value, 10);
  if (
    !Number.isInteger(number) ||
    String(number) !== value ||
    number < minimum ||
    number > maximum
  ) {
    throw new ConfigurationError("CONFIG_INVALID", variable);
  }
  return number;
}

function requiredValue(value: string | undefined, variable: string): string {
  const normalized = optionalValue(value);
  if (!normalized) throw new ConfigurationError("CONFIG_REQUIRED", variable);
  return normalized;
}

function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
