import {
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { IdentityGuard } from "../identity/identity.guard.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";
import { BillingService, type ResolutionInput } from "./billing.service.js";

type RequestWithActor = FastifyRequest & { actor: AuthenticatedActor };
@Controller("v1")
@UseGuards(IdentityGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get("admin/orders/:id/billing") adminBilling(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
  ) {
    return this.billing.view(request.actor, id);
  }
  @Get("requests/:requestId/billing") ownBilling(
    @Req() request: RequestWithActor,
    @Param("requestId") requestId: string,
  ) {
    return this.billing.viewByRequest(request.actor, requestId);
  }
  @Post("admin/orders/:id/resolution") resolve(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Headers("idempotency-key") key: string | undefined,
    @Headers("x-request-id") correlation: string | undefined,
    @Body() body: unknown,
  ) {
    if (!key || key.length < 16 || key.length > 160)
      throw new ConflictException("IDEMPOTENCY_KEY_INVALID");
    return this.billing.resolve(request.actor, id, key, resolutionInput(body), correlation);
  }
  @Post("requests/:requestId/payment-attempts") checkout(
    @Req() request: RequestWithActor,
    @Param("requestId") requestId: string,
    @Headers("idempotency-key") key: string | undefined,
    @Body() body: unknown,
  ) {
    if (!key || key.length < 16 || key.length > 160)
      throw new ConflictException("IDEMPOTENCY_KEY_INVALID");
    return this.billing.startCheckout(request.actor, requestId, paymentStart(body));
  }
  @Post("requests/:requestId/conformity") conformity(
    @Req() request: RequestWithActor,
    @Param("requestId") requestId: string,
    @Headers("idempotency-key") key: string | undefined,
    @Body() body: unknown,
  ) {
    if (!key || key.length < 16 || key.length > 160)
      throw new ConflictException("IDEMPOTENCY_KEY_INVALID");
    const input = conformityInput(body);
    return this.billing.conformity(
      request.actor,
      requestId,
      input.textVersion,
      input.expectedOrderVersion,
    );
  }
}
function object(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ConflictException("BILLING_BODY_INVALID");
  return body as Record<string, unknown>;
}
function resolutionInput(body: unknown): ResolutionInput {
  const item = object(body);
  if (
    Object.keys(item).some(
      (key) => !["outcome", "summary", "expectedOrderVersion"].includes(key),
    ) ||
    (item.outcome !== "RESUELTO_EN_VISITA" && item.outcome !== "REQUIERE_PRESUPUESTO") ||
    typeof item.summary !== "string" ||
    !item.summary.trim() ||
    item.summary.trim().length > 500 ||
    !Number.isInteger(item.expectedOrderVersion) ||
    (item.expectedOrderVersion as number) < 1
  )
    throw new ConflictException("RESOLUTION_BODY_INVALID");
  return {
    outcome: item.outcome,
    summary: item.summary.trim(),
    expectedOrderVersion: item.expectedOrderVersion as number,
  };
}
function paymentStart(body: unknown) {
  const item = object(body);
  if (
    Object.keys(item).length !== 1 ||
    !Number.isInteger(item.expectedOrderVersion) ||
    (item.expectedOrderVersion as number) < 1
  )
    throw new ConflictException("PAYMENT_ATTEMPT_BODY_INVALID");
  return item.expectedOrderVersion as number;
}
function conformityInput(body: unknown) {
  const item = object(body);
  if (
    Object.keys(item).some(
      (key) => !["textVersion", "expectedOrderVersion", "accepted"].includes(key),
    ) ||
    item.accepted !== true ||
    typeof item.textVersion !== "string" ||
    !/^v[1-9][0-9]*$/.test(item.textVersion) ||
    !Number.isInteger(item.expectedOrderVersion) ||
    (item.expectedOrderVersion as number) < 1
  )
    throw new ConflictException("CONFORMITY_BODY_INVALID");
  return {
    textVersion: item.textVersion,
    expectedOrderVersion: item.expectedOrderVersion as number,
  };
}
