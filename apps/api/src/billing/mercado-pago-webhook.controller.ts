import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  InvalidWebhookSignatureError,
  SignatureFailureReason,
  WebhookSignatureValidator,
} from "mercadopago";
import { loadApiConfiguration, type EnvironmentVariables } from "@pigar/config";
import { createLogger } from "@pigar/observability";
import { DatabaseService } from "../database.service.js";

const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60_000;

type HeaderValue = string | string[] | undefined;

export type WebhookSignatureFailure =
  "WEBHOOK_SIGNATURE_HEADER_INVALID" | "WEBHOOK_SIGNATURE_INVALID" | "WEBHOOK_TIMESTAMP_INVALID";

export type WebhookSignatureDiagnostic =
  | "WEBHOOK_SIGNATURE_BODY_DATA_ID_MATCH"
  | "WEBHOOK_SIGNATURE_EVENT_ID_MATCH"
  | "WEBHOOK_SIGNATURE_LOWERCASE_DATA_ID_MATCH"
  | "WEBHOOK_SIGNATURE_REQUEST_ID_FIRST_VALUE_MATCH"
  | "WEBHOOK_SIGNATURE_WITHOUT_REQUEST_ID_MATCH";

export type WebhookSchemaFailure =
  | "WEBHOOK_SCHEMA_BODY_INVALID"
  | "WEBHOOK_SCHEMA_QUERY_DATA_ID_INVALID"
  | "WEBHOOK_SCHEMA_TOPIC_INVALID";

@Controller("v1/webhooks/mercado-pago")
export class MercadoPagoWebhookController {
  private readonly logger = createLogger({
    environment: process.env.NODE_ENV ?? "development",
    service: "api-mercado-pago-webhook",
  });
  private readonly webhookSecret: string | undefined;

  constructor(private readonly database: DatabaseService) {
    this.webhookSecret = mercadoPagoWebhookSecret(process.env);
    this.logger.info("payment.webhook.configuration", undefined, {
      code: this.webhookSecret ? "WEBHOOK_CONFIGURED" : "WEBHOOK_CONFIG_MISSING",
      duration_ms: 0,
    });
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Headers("x-signature") rawSignature: HeaderValue,
    @Headers("x-request-id") rawRequestId: HeaderValue,
    @Query("data.id") rawDataId: HeaderValue,
    @Query("type") rawType: HeaderValue,
    @Body() body: unknown,
  ) {
    const secret = this.webhookSecret;
    if (!secret) {
      this.reject("WEBHOOK_CONFIG_MISSING");
      throw new ServiceUnavailableException();
    }

    const signature = singleHeader(rawSignature);
    const requestIdValue = singleValue(rawRequestId);
    const dataId = singleValue(rawDataId);
    if (!signature) {
      this.reject("WEBHOOK_SIGNATURE_HEADER_INVALID");
      throw new UnauthorizedException();
    }
    const requestId = singleRequestId(rawRequestId);
    if (!requestId) {
      const diagnostic =
        dataId && !Array.isArray(rawRequestId)
          ? webhookSignatureDiagnostic(signature, requestIdValue ?? "", dataId, body, secret)
          : undefined;
      this.reject(diagnostic ?? "WEBHOOK_SIGNATURE_HEADER_INVALID");
      throw new UnauthorizedException();
    }

    const schemaFailure = webhookSchemaFailure(rawDataId, rawType, body);
    if (!dataId) {
      this.reject(schemaFailure ?? "WEBHOOK_SCHEMA_QUERY_DATA_ID_INVALID");
      throw new BadRequestException();
    }

    const signatureFailure = webhookSignatureFailure(signature, requestId, dataId, secret);
    const diagnostic =
      signatureFailure === "WEBHOOK_SIGNATURE_INVALID"
        ? webhookSignatureDiagnostic(signature, requestId, dataId, body, secret)
        : undefined;
    if (schemaFailure) {
      this.reject(diagnostic ?? schemaFailure);
      throw new BadRequestException();
    }
    if (signatureFailure) {
      this.reject(diagnostic ?? signatureFailure);
      throw new UnauthorizedException();
    }

    // Mercado Pago asigna un id al disparo. Se conserva sólo su hash para
    // deduplicar reintentos sin persistir identificadores del proveedor.
    const eventHash = createHash("sha256")
      .update(String(webhookEventId(body)))
      .digest("hex");
    try {
      await this.database.$transaction(async (tx) => {
        await tx.providerEventReceipt.create({
          data: {
            provider: "mercado-pago",
            externalEventIdHash: eventHash,
            eventType: "payment",
            validationState: "VALID",
            validatedAt: new Date(),
          },
        });
        await tx.claimedJob.upsert({
          where: {
            jobType_idempotencyKey: {
              jobType: "mercado-pago-payment-reconciliation",
              idempotencyKey: dataId,
            },
          },
          create: {
            jobType: "mercado-pago-payment-reconciliation",
            // Sólo se persiste en la cola técnica; nunca se registra en logs/evidencia.
            idempotencyKey: dataId,
          },
          update: {
            state: "PENDING",
            availableAt: new Date(),
            leaseExpiresAt: null,
            lastSafeError: null,
          },
        });
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
        return { received: true, duplicate: true };
      throw error;
    }
    return { received: true };
  }

  private reject(
    code:
      | WebhookSchemaFailure
      | WebhookSignatureDiagnostic
      | WebhookSignatureFailure
      | "WEBHOOK_CONFIG_MISSING",
  ) {
    this.logger.warn("payment.webhook.rejected", undefined, { code, duration_ms: 0 });
  }
}

export function mercadoPagoWebhookSecret(environment: EnvironmentVariables): string | undefined {
  return loadApiConfiguration(environment).mercadoPago?.webhookSecret;
}

function singleValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value) || typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function singleHeader(value: HeaderValue): string | undefined {
  return singleValue(value);
}

function singleRequestId(value: HeaderValue): string | undefined {
  const normalized = singleValue(value);
  return normalized && !normalized.includes(",") ? normalized : undefined;
}

function webhookEventId(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const id = (value as Record<string, unknown>).id;
  return typeof id === "string" || typeof id === "number" ? String(id) : undefined;
}

function webhookBodyDataId(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const data = (value as Record<string, unknown>).data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const id = (data as Record<string, unknown>).id;
  return typeof id === "string" || typeof id === "number" ? String(id) : undefined;
}

type PaymentNotification = {
  id: string | number;
  type: "payment";
  action?: string;
  api_version?: string;
  date_created?: string;
  live_mode?: boolean;
  data: { id: string | number };
};

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isPayment(value: unknown, dataId: string): value is PaymentNotification {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (
    (typeof item.id !== "string" && typeof item.id !== "number") ||
    item.type !== "payment" ||
    !isOptionalString(item.action) ||
    !isOptionalString(item.api_version) ||
    !isOptionalString(item.date_created) ||
    (item.live_mode !== undefined && typeof item.live_mode !== "boolean") ||
    !item.data ||
    typeof item.data !== "object" ||
    Array.isArray(item.data)
  )
    return false;
  const bodyDataId = (item.data as Record<string, unknown>).id;
  return (
    (typeof bodyDataId === "string" || typeof bodyDataId === "number") &&
    String(bodyDataId) === dataId
  );
}

export function webhookSchemaFailure(
  rawDataId: HeaderValue,
  rawType: HeaderValue,
  body: unknown,
): WebhookSchemaFailure | undefined {
  const dataId = singleValue(rawDataId);
  if (!dataId || !/^[A-Za-z0-9_-]{1,100}$/.test(dataId))
    return "WEBHOOK_SCHEMA_QUERY_DATA_ID_INVALID";
  if (singleValue(rawType) !== "payment") return "WEBHOOK_SCHEMA_TOPIC_INVALID";
  return isPayment(body, dataId) ? undefined : "WEBHOOK_SCHEMA_BODY_INVALID";
}

export function validWebhookSignature(
  signature: string,
  requestId: string,
  dataId: string,
  secret: string,
  nowMs = Date.now(),
): boolean {
  return webhookSignatureFailure(signature, requestId, dataId, secret, nowMs) === undefined;
}

function signatureComponents(signature: string): {
  timestamp: string | undefined;
  valid: boolean;
} {
  const components = signature.split(",").map((part) => part.trim());
  const timestamps = components.filter((part) => /^ts=/i.test(part));
  const versionOneHashes = components.filter((part) => /^v1=/i.test(part));
  const timestamp = timestamps[0]?.slice(timestamps[0].indexOf("=") + 1).trim();
  const hash = versionOneHashes[0]?.slice(versionOneHashes[0].indexOf("=") + 1).trim();
  return {
    timestamp,
    valid:
      timestamps.length === 1 &&
      versionOneHashes.length === 1 &&
      Boolean(timestamp && /^\d+$/.test(timestamp)) &&
      Boolean(hash && /^[a-fA-F0-9]{64}$/.test(hash)),
  };
}

export function webhookSignatureFailure(
  signature: string,
  requestId: string,
  dataId: string,
  secret: string,
  nowMs = Date.now(),
): WebhookSignatureFailure | undefined {
  const components = signatureComponents(signature);
  if (!components.valid || !components.timestamp) return "WEBHOOK_SIGNATURE_HEADER_INVALID";
  try {
    WebhookSignatureValidator.validate({
      xSignature: signature,
      xRequestId: requestId,
      dataId,
      secret,
    });
    const timestampNumber = Number(components.timestamp);
    const timestampMs =
      components.timestamp.length < 13 ? timestampNumber * 1_000 : timestampNumber;
    if (
      !Number.isSafeInteger(timestampNumber) ||
      Math.abs(nowMs - timestampMs) > WEBHOOK_TIMESTAMP_TOLERANCE_MS
    )
      return "WEBHOOK_TIMESTAMP_INVALID";
    return undefined;
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      if (error.reason === SignatureFailureReason.TimestampOutOfTolerance)
        return "WEBHOOK_TIMESTAMP_INVALID";
      if (error.reason !== SignatureFailureReason.SignatureMismatch)
        return "WEBHOOK_SIGNATURE_HEADER_INVALID";
    }
    return "WEBHOOK_SIGNATURE_INVALID";
  }
}

export function webhookSignatureDiagnostic(
  signature: string,
  requestId: string,
  dataId: string,
  body: unknown,
  secret: string,
  nowMs = Date.now(),
): WebhookSignatureDiagnostic | undefined {
  const bodyDataId = webhookBodyDataId(body);
  const eventId = webhookEventId(body);
  const candidates: Array<[WebhookSignatureDiagnostic, string, string]> = [];
  if (bodyDataId && bodyDataId !== dataId)
    candidates.push(["WEBHOOK_SIGNATURE_BODY_DATA_ID_MATCH", requestId, bodyDataId]);
  if (eventId && eventId !== dataId)
    candidates.push(["WEBHOOK_SIGNATURE_EVENT_ID_MATCH", requestId, eventId]);
  if (dataId.toLowerCase() !== dataId)
    candidates.push(["WEBHOOK_SIGNATURE_LOWERCASE_DATA_ID_MATCH", requestId, dataId.toLowerCase()]);
  const firstRequestId = requestId.split(",", 1)[0]?.trim();
  if (requestId.includes(",") && firstRequestId)
    candidates.push(["WEBHOOK_SIGNATURE_REQUEST_ID_FIRST_VALUE_MATCH", firstRequestId, dataId]);
  candidates.push(["WEBHOOK_SIGNATURE_WITHOUT_REQUEST_ID_MATCH", "", dataId]);
  return candidates.find(
    ([, candidateRequestId, candidateDataId]) =>
      webhookSignatureFailure(signature, candidateRequestId, candidateDataId, secret, nowMs) ===
      undefined,
  )?.[0];
}
