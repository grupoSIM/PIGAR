import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { correlationId } from "@pigar/observability";
import type { FastifyRequest } from "fastify";
import { DatabaseService } from "../database.service.js";
import { Auth0ProvisioningService } from "./auth0-provisioning.service.js";
import { IdentityGuard } from "./identity.guard.js";
import type { AuthenticatedActor } from "./identity.types.js";

type RequestWithActor = FastifyRequest & { actor: AuthenticatedActor };

@Controller("v1/admin/profiles")
@UseGuards(IdentityGuard)
export class AdminProfilesController {
  constructor(
    private readonly database: DatabaseService,
    private readonly provisioning: Auth0ProvisioningService,
  ) {}

  @Get()
  async list(@Req() request: RequestWithActor) {
    adminOnly(request.actor);
    const profiles = await this.database.profile.findMany({
      where: { role: { in: ["ADMIN", "DISPATCHER"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, displayName: true, role: true, status: true },
    });
    return { items: profiles };
  }

  @Post()
  @HttpCode(202)
  async provision(
    @Req() request: RequestWithActor,
    @Body() body: unknown,
    @Headers("x-request-id") requestId: string | undefined,
  ) {
    adminOnly(request.actor);
    const account = provisionInput(body);
    const idempotencyKey = `auth0-provision:${account.idempotencyKey}`;
    const claimed = await this.database.claimedJob.findUnique({
      where: { jobType_idempotencyKey: { idempotencyKey, jobType: "AUTH0_PROVISION" } },
    });
    if (claimed?.state === "PROCESSED") return;
    if (!claimed) {
      try {
        await this.database.claimedJob.create({
          data: { idempotencyKey, jobType: "AUTH0_PROVISION", state: "PROCESSING" },
        });
      } catch {
        return;
      }
    }
    try {
      const subject = await this.provisioning.provisionInternalAccount(account.email);
      const profile = await this.database.profile.upsert({
        where: { identitySubject: subject },
        create: { identitySubject: subject, role: account.role },
        update: { role: account.role, status: "ACTIVE" },
      });
      await this.database.claimedJob.update({
        where: { jobType_idempotencyKey: { idempotencyKey, jobType: "AUTH0_PROVISION" } },
        data: { state: "PROCESSED" },
      });
      await this.audit(request.actor.profileId, profile.id, "admin.account.provisioned", requestId);
    } catch (error) {
      await this.database.claimedJob.update({
        where: { jobType_idempotencyKey: { idempotencyKey, jobType: "AUTH0_PROVISION" } },
        data: { state: "FAILED" },
      });
      throw error;
    }
  }

  @Post(":profileId/password-reset")
  @HttpCode(202)
  async passwordReset(
    @Req() request: RequestWithActor,
    @Param("profileId") profileId: string,
    @Headers("x-request-id") requestId: string | undefined,
  ) {
    adminOnly(request.actor);
    const profile = await this.database.profile.findUniqueOrThrow({ where: { id: profileId } });
    if (profile.role === "CLIENT") throw new ForbiddenException();
    await this.provisioning.requestPasswordReset(profile.identitySubject);
    await this.audit(
      request.actor.profileId,
      profile.id,
      "admin.account.password_reset_requested",
      requestId,
    );
  }

  @Patch(":profileId/role")
  async changeRole(
    @Req() request: RequestWithActor,
    @Param("profileId") profileId: string,
    @Body() body: unknown,
    @Headers("x-request-id") requestId: string | undefined,
  ) {
    adminOnly(request.actor);
    const role = internalRole(body);
    const target = await this.database.profile.findUniqueOrThrow({ where: { id: profileId } });
    if (target.role === "ADMIN" && role !== "ADMIN") await this.ensureAnotherAdmin(target.id);
    const profile = await this.database.profile.update({
      where: { id: target.id },
      data: { role },
    });
    await this.audit(request.actor.profileId, profile.id, "admin.profile.role_changed", requestId);
    return { id: profile.id, role: profile.role, status: profile.status };
  }

  @Post(":profileId/deactivate")
  @HttpCode(204)
  async deactivate(
    @Req() request: RequestWithActor,
    @Param("profileId") profileId: string,
    @Headers("x-request-id") requestId: string | undefined,
  ) {
    adminOnly(request.actor);
    if (request.actor.profileId === profileId) throw new ConflictException();
    const target = await this.database.profile.findUniqueOrThrow({ where: { id: profileId } });
    if (target.role === "ADMIN" && target.status === "ACTIVE")
      await this.ensureAnotherAdmin(target.id);
    await this.database.profile.update({ where: { id: target.id }, data: { status: "INACTIVE" } });
    await this.audit(request.actor.profileId, target.id, "profile.deactivated", requestId);
  }

  private async ensureAnotherAdmin(excludedId: string) {
    const count = await this.database.profile.count({
      where: { id: { not: excludedId }, role: "ADMIN", status: "ACTIVE" },
    });
    if (!count) throw new ConflictException("LAST_ADMIN");
  }

  private async audit(
    actorProfileId: string,
    subjectProfileId: string,
    eventType: string,
    requestId: string | undefined,
  ) {
    await this.database.accessAuditEvent.create({
      data: {
        actorProfileId,
        correlationId: correlationId(requestId),
        eventType,
        outcome: "SUCCESS",
        subjectProfileId,
      },
    });
  }
}

function adminOnly(actor: AuthenticatedActor) {
  if (actor.role !== "ADMIN") throw new ForbiddenException();
}

function internalRole(body: unknown): "ADMIN" | "DISPATCHER" {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ConflictException();
  const role = (body as Record<string, unknown>).role;
  if (role !== "ADMIN" && role !== "DISPATCHER") throw new ConflictException();
  return role;
}

function provisionInput(body: unknown): {
  email: string;
  idempotencyKey: string;
  role: "ADMIN" | "DISPATCHER";
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ConflictException();
  const input = body as Record<string, unknown>;
  if (
    typeof input.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
    typeof input.idempotencyKey !== "string" ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(input.idempotencyKey) ||
    (input.role !== "ADMIN" && input.role !== "DISPATCHER")
  )
    throw new ConflictException();
  return { email: input.email, idempotencyKey: input.idempotencyKey, role: input.role };
}
