declare const console: { log: (value: string) => void };

type LogLevel = "error" | "info" | "warn";
type SafeLogValue = boolean | number | string;

export type StructuredLogger = {
  error: (
    event: string,
    correlationId: string | undefined,
    fields?: Record<string, SafeLogValue>,
  ) => void;
  info: (
    event: string,
    correlationId: string | undefined,
    fields?: Record<string, SafeLogValue>,
  ) => void;
  warn: (
    event: string,
    correlationId: string | undefined,
    fields?: Record<string, SafeLogValue>,
  ) => void;
};

export type StructuredLogEntry = {
  code: string;
  correlation_id: string;
  duration_ms: number;
  environment: string;
  event: string;
  level: LogLevel;
  metric_value?: number;
  service: string;
  timestamp: string;
};

const sensitiveKey =
  /authorization|cookie|password|secret|token|database|address|email|location|payload/i;

export function createLogger(options: {
  environment: string;
  service: string;
  write?: (entry: StructuredLogEntry) => void;
}): StructuredLogger {
  const write = options.write ?? ((entry) => console.log(JSON.stringify(entry)));

  return {
    error: (event, correlationId, fields) =>
      log(write, "error", options, event, correlationId, fields),
    info: (event, correlationId, fields) =>
      log(write, "info", options, event, correlationId, fields),
    warn: (event, correlationId, fields) =>
      log(write, "warn", options, event, correlationId, fields),
  };
}

export function correlationId(value: string | undefined): string {
  return value && /^[a-zA-Z0-9_-]{16,128}$/.test(value) ? value : generatedCorrelationId();
}

function generatedCorrelationId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const nibble = character === "x" ? random : (random & 0x3) | 0x8;
    return nibble.toString(16);
  });
}

function log(
  write: (entry: StructuredLogEntry) => void,
  level: LogLevel,
  options: { environment: string; service: string },
  event: string,
  requestId: string | undefined,
  fields: Record<string, SafeLogValue> = {},
): void {
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([key]) => !sensitiveKey.test(key)),
  );
  const duration = safeFields.duration_ms;
  const code = safeFields.code;
  const entry: StructuredLogEntry = {
    code: typeof code === "string" ? code : "OK",
    correlation_id: correlationId(requestId),
    duration_ms: typeof duration === "number" && duration >= 0 ? duration : 0,
    environment: options.environment,
    event,
    level,
    ...(typeof safeFields.metric_value === "number" && safeFields.metric_value >= 0
      ? { metric_value: safeFields.metric_value }
      : {}),
    service: options.service,
    timestamp: new Date().toISOString(),
  };
  write(entry);
}
