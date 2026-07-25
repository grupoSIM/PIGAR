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
  environment: PigarEnvironment;
  host: string;
  mediaRoot?: string;
  port: number;
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

  if (!/^[a-zA-Z0-9.-]+$/.test(host)) throw new ConfigurationError("CONFIG_INVALID", "HOST");
  if (runtimeEnvironment === "production") {
    requiredValue(environment.DATABASE_URL, "DATABASE_URL");
    requiredValue(mediaRoot, "MEDIA_ROOT");
  }

  return {
    environment: runtimeEnvironment,
    host,
    ...(mediaRoot ? { mediaRoot } : {}),
    port,
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
