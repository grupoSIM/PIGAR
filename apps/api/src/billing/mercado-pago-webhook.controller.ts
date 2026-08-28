import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  InvalidWebhookSignatureError,
  SignatureFailureReason,
  WebhookSignatureValidator,
} from "mercadopago";
import { loadApiConfiguration } from "@pigar/config";
import { createLogger } from "@pigar/observability";
import { DatabaseService } from "../database.service.js";
import { BillingService } from "./billing.service.js";

@Controller("v1/webhooks/mercado-pago")
export class MercadoPagoWebhookController {
  private readonly logger = createLogger({
    environment: process.env.NODE_ENV ?? "development",
    service: "api-mercado-pago-webhook",
  });

  constructor(
    private readonly billing: BillingService,
    private readonly database: DatabaseService,
  ) {}
  @Post() @HttpCode(200) async receive(
    @Headers("x-signature") signature: string | undefined,
    @Headers("x-request-id") requestId: string | undefined,
    @Query("data.id") dataId: string | undefined,
    @Query("type") type: string | undefined,
    @Body() body: unknown,
  ) {
    const secret = loadApiConfiguration(process.env).mercadoPago?.webhookSecret;
    const signatureFailure =
      secret && signature && requestId && dataId
        ? webhookSignatureFailure(signature, requestId, dataId, secret)
        : undefined;
    if (
      !secret ||
      !signature ||
      !requestId ||
      !dataId ||
      type !== "payment" ||
      !isPayment(body, dataId) ||
      signatureFailure
    ) {
      this.logger.warn("payment.webhook.rejected", undefined, {
        code: !secret ? "WEBHOOK_CONFIG_MISSING" : (signatureFailure ?? "WEBHOOK_SCHEMA_INVALID"),
        duration_ms: 0,
      });
      throw new UnauthorizedException();
    }
    // Mercado Pago asigna un id al disparo. Se conserva sólo su hash para
    // deduplicar reintentos sin persistir identificadores del proveedor.
    const eventHash = createHash("sha256").update(String(body.id)).digest("hex");
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
}
type PaymentNotification = {
  id: string | number;
  type: "payment";
  action: string;
  api_version: string;
  date_created: string;
  data: { id: string | number };
};

function isPayment(value: unknown, dataId: string): value is PaymentNotification {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (
    (typeof item.id !== "string" && typeof item.id !== "number") ||
    item.type !== "payment" ||
    typeof item.action !== "string" ||
    typeof item.api_version !== "string" ||
    typeof item.date_created !== "string" ||
    !item.data ||
    typeof item.data !== "object" ||
    Array.isArray(item.data)
  )
    return false;
  return String((item.data as Record<string, unknown>).id) === dataId;
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

export function webhookSignatureFailure(
  signature: string,
  requestId: string,
  dataId: string,
  secret: string,
  nowMs = Date.now(),
): "WEBHOOK_TIMESTAMP_INVALID" | "WEBHOOK_SIGNATURE_INVALID" | undefined {
  try {
    const timestamp = signature.match(/(?:^|,)\s*ts=(\d+)/)?.[1];
    WebhookSignatureValidator.validate({
      xSignature: signature,
      xRequestId: requestId,
      dataId,
      secret,
    });
    const timestampNumber = Number(timestamp);
    const timestampMs =
      timestamp && timestamp.length < 13 ? timestampNumber * 1_000 : timestampNumber;
    if (!Number.isSafeInteger(timestampNumber) || Math.abs(nowMs - timestampMs) > 5 * 60_000)
      return "WEBHOOK_TIMESTAMP_INVALID";
    return undefined;
  } catch (error) {
    if (
      error instanceof InvalidWebhookSignatureError &&
      error.reason === SignatureFailureReason.TimestampOutOfTolerance
    )
      return "WEBHOOK_TIMESTAMP_INVALID";
    return "WEBHOOK_SIGNATURE_INVALID";
  }
}
