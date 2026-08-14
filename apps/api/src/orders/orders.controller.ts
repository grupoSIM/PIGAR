import {
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { OrderTransitionAction } from "@pigar/contracts";
import type { FastifyRequest } from "fastify";
import { IdentityGuard } from "../identity/identity.guard.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";
import { OrdersService, type TechnicianInput, type TransitionInput } from "./orders.service.js";

type RequestWithActor = FastifyRequest & { actor: AuthenticatedActor };
@Controller("v1")
@UseGuards(IdentityGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get("admin/technicians") listTechnicians(@Req() request: RequestWithActor) {
    return this.orders.technicians(request.actor);
  }
  @Post("admin/technicians") createTechnician(
    @Req() request: RequestWithActor,
    @Body() body: unknown,
    @Headers("x-request-id") correlation?: string,
  ) {
    return this.orders.createTechnician(
      request.actor,
      technicianInput(body, false) as TechnicianInput,
      correlation,
    );
  }
  @Patch("admin/technicians/:id") updateTechnician(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("x-request-id") correlation?: string,
  ) {
    return this.orders.updateTechnician(
      request.actor,
      id,
      technicianInput(body, true),
      correlation,
    );
  }
  @Post("admin/requests/:requestId/assignment") assign(
    @Req() request: RequestWithActor,
    @Param("requestId") requestId: string,
    @Headers("idempotency-key") key: string | undefined,
    @Headers("x-request-id") correlation: string | undefined,
    @Body() body: unknown,
  ) {
    if (!key || key.length > 160) throw new ConflictException("IDEMPOTENCY_KEY_INVALID");
    return this.orders.assign(request.actor, requestId, technicianId(body), key, correlation);
  }
  @Get("admin/orders") list(
    @Req() request: RequestWithActor,
    @Headers("x-request-id") correlation?: string,
  ) {
    return this.orders.list(request.actor, correlation);
  }
  @Post("admin/orders/:id/transitions") transition(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("x-request-id") correlation?: string,
  ) {
    return this.orders.transition(request.actor, id, transitionInput(body), correlation);
  }
  @Get("requests/:requestId/order") customerView(
    @Req() request: RequestWithActor,
    @Param("requestId") requestId: string,
  ) {
    return this.orders.customerView(request.actor, requestId);
  }
}

function source(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ConflictException("ORDER_BODY_INVALID");
  return body as Record<string, unknown>;
}
function technicianInput(
  body: unknown,
  partial: boolean,
): Partial<TechnicianInput> | TechnicianInput {
  const item = source(body);
  const keys = ["fullName", "phone", "status"];
  if (
    Object.keys(item).some((key) => !keys.includes(key)) ||
    (!partial && Object.keys(item).length !== 3)
  )
    throw new ConflictException("TECHNICIAN_BODY_INVALID");
  const result: Partial<TechnicianInput> = {};
  if (item.fullName !== undefined) {
    if (typeof item.fullName !== "string") throw new ConflictException("TECHNICIAN_BODY_INVALID");
    result.fullName = item.fullName.trim();
  }
  if (item.phone !== undefined) {
    if (typeof item.phone !== "string") throw new ConflictException("TECHNICIAN_BODY_INVALID");
    result.phone = item.phone.trim();
  }
  if (item.status !== undefined) {
    if (item.status !== "ACTIVE" && item.status !== "INACTIVE")
      throw new ConflictException("TECHNICIAN_BODY_INVALID");
    result.status = item.status;
  }
  if (partial && Object.keys(result).length === 0)
    throw new ConflictException("TECHNICIAN_BODY_INVALID");
  return result as TechnicianInput;
}
function technicianId(body: unknown) {
  const item = source(body);
  if (
    Object.keys(item).length !== 1 ||
    typeof item.technicianId !== "string" ||
    !uuid(item.technicianId)
  )
    throw new ConflictException("TECHNICIAN_ID_INVALID");
  return item.technicianId;
}
function transitionInput(body: unknown): TransitionInput {
  const item = source(body);
  const keys = ["action", "expectedVersion", "reason", "technicianId"];
  if (
    Object.keys(item).some((key) => !keys.includes(key)) ||
    !Object.values(OrderTransitionAction).includes(item.action as OrderTransitionAction) ||
    !Number.isInteger(item.expectedVersion) ||
    (item.expectedVersion as number) < 1 ||
    (item.reason !== undefined &&
      (typeof item.reason !== "string" ||
        !item.reason.trim() ||
        item.reason.trim().length > 500)) ||
    (item.technicianId !== undefined &&
      (typeof item.technicianId !== "string" || !uuid(item.technicianId)))
  )
    throw new ConflictException("ORDER_TRANSITION_BODY_INVALID");
  return {
    action: item.action as OrderTransitionAction,
    expectedVersion: item.expectedVersion as number,
    ...(typeof item.reason === "string" ? { reason: item.reason.trim() } : {}),
    ...(typeof item.technicianId === "string" ? { technicianId: item.technicianId } : {}),
  };
}
function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
