import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { correlationId } from "@pigar/observability";
import type { FastifyRequest } from "fastify";
import { DatabaseService } from "../database.service.js";
import { IdentityGuard } from "./identity.guard.js";
import type { AuthenticatedActor } from "./identity.types.js";

type RequestWithActor = FastifyRequest & { actor: AuthenticatedActor };

@Controller("v1/me")
@UseGuards(IdentityGuard)
export class MeController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async get(@Req() request: RequestWithActor) {
    const profile = await this.database.profile.findUniqueOrThrow({
      where: { id: request.actor.profileId },
    });
    return {
      displayName: profile.displayName,
      id: profile.id,
      phone: profile.phone,
      role: profile.role,
    };
  }

  @Patch()
  async patch(
    @Req() request: RequestWithActor,
    @Body() body: unknown,
    @Headers("x-request-id") requestId: string | undefined,
  ) {
    if (request.actor.role !== "CLIENT") throw new ForbiddenException();
    const changes = profileChanges(body);
    const profile = await this.database.profile.update({
      where: { id: request.actor.profileId },
      data: changes,
    });
    await this.database.accessAuditEvent.create({
      data: {
        actorProfileId: profile.id,
        correlationId: correlationId(requestId),
        eventType: "profile.updated",
        outcome: "SUCCESS",
        subjectProfileId: profile.id,
      },
    });
    return {
      displayName: profile.displayName,
      id: profile.id,
      phone: profile.phone,
      role: profile.role,
    };
  }
}

function profileChanges(body: unknown): { displayName?: string; phone?: string | null } {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequestException();
  const input = body as Record<string, unknown>;
  const keys = Object.keys(input);
  if (!keys.length || keys.some((key) => key !== "displayName" && key !== "phone"))
    throw new BadRequestException();
  const changes: { displayName?: string; phone?: string | null } = {};
  if ("displayName" in input) {
    if (
      typeof input.displayName !== "string" ||
      !input.displayName.trim() ||
      input.displayName.trim().length > 120
    )
      throw new BadRequestException();
    changes.displayName = input.displayName.trim();
  }
  if ("phone" in input) {
    if (input.phone === null) changes.phone = null;
    else if (typeof input.phone === "string" && /^\+[1-9][0-9]{7,14}$/.test(input.phone))
      changes.phone = input.phone;
    else throw new BadRequestException();
  }
  return changes;
}
