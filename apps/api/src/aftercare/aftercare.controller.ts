import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UnsupportedMediaTypeException,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { IdentityGuard } from "../identity/identity.guard.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";
import {
  AftercareService,
  RateLimitedException,
  validateIncident,
  validateRating,
} from "./aftercare.service.js";
type RequestWithActor = FastifyRequest & { actor: AuthenticatedActor };
@Controller("v1")
@UseGuards(IdentityGuard)
export class AftercareController {
  constructor(private readonly aftercare: AftercareService) {}
  @Post("requests/:requestId/rating") rating(
    @Req() r: RequestWithActor,
    @Param("requestId", new ParseUUIDPipe()) id: string,
    @Headers("idempotency-key") key: string | undefined,
    @Headers("content-type") contentType: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply | undefined,
  ) {
    return this.respond(
      reply,
      this.aftercare.createRating(
        r.actor,
        id,
        idempotencyKey(key),
        validateRating(jsonContentType(contentType, body)),
        r.ip,
      ),
      true,
    );
  }
  @Get("requests/:requestId/rating") getRating(
    @Req() r: RequestWithActor,
    @Param("requestId", new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) reply: FastifyReply | undefined,
  ) {
    return this.respond(reply, this.aftercare.rating(r.actor, id));
  }
  @Post("requests/:requestId/incidents") incident(
    @Req() r: RequestWithActor,
    @Param("requestId", new ParseUUIDPipe()) id: string,
    @Headers("idempotency-key") key: string | undefined,
    @Headers("content-type") contentType: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply | undefined,
  ) {
    return this.respond(
      reply,
      this.aftercare.createIncident(
        r.actor,
        id,
        idempotencyKey(key),
        validateIncident(jsonContentType(contentType, body)),
        r.ip,
      ),
      true,
    );
  }
  @Get("requests/:requestId/incidents") incidents(
    @Req() r: RequestWithActor,
    @Param("requestId", new ParseUUIDPipe()) id: string,
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply | undefined,
  ) {
    return this.respond(reply, this.aftercare.incidents(r.actor, id, page(cursor, limit)));
  }
  @Get("admin/incidents") adminIncidents(
    @Req() r: RequestWithActor,
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
    @Query("status") status: string | undefined,
    @Query("type") type: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply | undefined,
  ) {
    return this.respond(
      reply,
      this.aftercare.adminIncidents(r.actor, status, type, page(cursor, limit)),
    );
  }
  @Get("admin/orders/:id/aftercare") adminOrder(
    @Req() r: RequestWithActor,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.respond(reply, this.aftercare.adminOrder(r.actor, id, page(cursor, limit)));
  }
  @Post("admin/incidents/:id/transitions") transition(
    @Req() r: RequestWithActor,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Headers("idempotency-key") key: string | undefined,
    @Headers("content-type") contentType: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    jsonContentType(contentType, body);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new BadRequestException("INCIDENT_TRANSITION_BODY_INVALID");
    const x = body as { action?: "START_TRIAGE" | "CLOSE"; expectedVersion?: number };
    if (
      Object.keys(x).some((field) => field !== "action" && field !== "expectedVersion") ||
      (x.action !== "START_TRIAGE" && x.action !== "CLOSE") ||
      !Number.isInteger(x.expectedVersion) ||
      x.expectedVersion! < 1
    )
      throw new BadRequestException("INCIDENT_TRANSITION_BODY_INVALID");
    return this.respond(
      reply,
      this.aftercare.transition(r.actor, id, idempotencyKey(key), {
        action: x.action,
        expectedVersion: x.expectedVersion!,
      }),
      true,
      200,
    );
  }
  private async respond(
    reply: FastifyReply | undefined,
    action: Promise<unknown>,
    created = false,
    successStatus?: number,
  ) {
    try {
      const value = await action;
      if (successStatus) reply?.code(successStatus);
      else if (created && typeof value === "object" && value && "replayed" in value)
        reply?.code(200);
      return value;
    } catch (error) {
      if (error instanceof RateLimitedException) reply?.header("Retry-After", error.retryAfter);
      throw error;
    }
  }
}
function idempotencyKey(key: string | undefined) {
  if (!key || key.length < 16 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key))
    throw new BadRequestException("IDEMPOTENCY_KEY_INVALID");
  return key;
}
function page(cursor: string | undefined, rawLimit: string | undefined) {
  if (cursor !== undefined && (cursor.length < 1 || cursor.length > 512))
    throw new BadRequestException("AFTERCARE_PAGE_INVALID");
  if (
    rawLimit !== undefined &&
    (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 50)
  )
    throw new BadRequestException("AFTERCARE_PAGE_INVALID");
  return { cursor, limit: rawLimit ? Number(rawLimit) : 20 };
}
function jsonContentType(contentType: string | undefined, body: unknown) {
  if (!contentType?.toLowerCase().startsWith("application/json"))
    throw new UnsupportedMediaTypeException("AFTERCARE_CONTENT_TYPE_INVALID");
  return body;
}
