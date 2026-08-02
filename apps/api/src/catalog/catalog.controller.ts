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
import { IdentityGuard } from "../identity/identity.guard.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";
import { CatalogService, type CatalogRateInput } from "./catalog.service.js";

type RequestWithActor = FastifyRequest & { actor: AuthenticatedActor };

@Controller("v1/catalog")
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("offers")
  async offers() {
    return this.catalog.publicOffers();
  }
}

@Controller("v1/admin/catalog")
@UseGuards(IdentityGuard)
export class AdminCatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly database: DatabaseService,
  ) {}

  @Get()
  async list(@Req() request: RequestWithActor) {
    adminOrDispatcher(request.actor);
    return { items: await this.catalog.operationalCatalog() };
  }

  @Post("categories")
  async createCategory(
    @Req() request: RequestWithActor,
    @Body() body: unknown,
    @Headers("x-request-id") requestId?: string,
  ) {
    adminOnly(request.actor);
    const category = await this.catalog.createCategory(categoryInput(body));
    await this.audit(request.actor.profileId, "catalog.category.created", category.id, requestId);
    return category;
  }

  @Patch("categories/:id")
  async updateCategory(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("x-request-id") requestId?: string,
  ) {
    adminOnly(request.actor);
    const category = await this.catalog.updateCategory(id, categoryPatch(body));
    await this.audit(request.actor.profileId, "catalog.category.updated", category.id, requestId);
    return category;
  }

  @Post("categories/:id/:status")
  async setCategoryStatus(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Param("status") status: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    adminOnly(request.actor);
    if (status !== "publish" && status !== "retire") throw new ConflictException();
    const category = await this.catalog.setCategoryStatus(
      id,
      status === "publish" ? "PUBLISHED" : "RETIRED",
    );
    await this.audit(
      request.actor.profileId,
      status === "publish" ? "catalog.category.published" : "catalog.category.retired",
      category.id,
      requestId,
    );
    return category;
  }

  @Post("zones")
  async createZone(
    @Req() request: RequestWithActor,
    @Body() body: unknown,
    @Headers("x-request-id") requestId?: string,
  ) {
    adminOnly(request.actor);
    const zone = await this.catalog.createZone(nameInput(body));
    await this.audit(request.actor.profileId, "catalog.zone.created", zone.id, requestId);
    return zone;
  }

  @Post("zones/:id/activate")
  async activateZone(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    adminOnly(request.actor);
    const zone = await this.catalog.activateZone(id);
    await this.audit(request.actor.profileId, "catalog.zone.activated", zone.id, requestId);
    return zone;
  }

  @Post("rates")
  async createRate(
    @Req() request: RequestWithActor,
    @Body() body: unknown,
    @Headers("x-request-id") requestId?: string,
  ) {
    adminOnly(request.actor);
    const rate = await this.catalog.createRate(rateInput(body));
    await this.audit(request.actor.profileId, "catalog.rate.created", rate.id, requestId);
    return rate;
  }

  @Post("rates/:id/:status")
  @HttpCode(200)
  async setRateStatus(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Param("status") status: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    adminOnly(request.actor);
    if (status !== "publish" && status !== "retire") throw new ConflictException();
    const rate =
      status === "publish" ? await this.catalog.publishRate(id) : await this.catalog.retireRate(id);
    await this.audit(
      request.actor.profileId,
      status === "publish" ? "catalog.rate.published" : "catalog.rate.retired",
      rate.id,
      requestId,
    );
    return rate;
  }

  private async audit(
    actorProfileId: string,
    eventType: string,
    resourceId: string,
    requestId?: string,
  ) {
    await this.database.accessAuditEvent.create({
      data: {
        actorProfileId,
        correlationId: correlationId(requestId),
        eventType,
        metadata: { resourceId },
        outcome: "SUCCESS",
      },
    });
  }
}

function adminOnly(actor: AuthenticatedActor) {
  if (actor.role !== "ADMIN") throw new ForbiddenException();
}

function adminOrDispatcher(actor: AuthenticatedActor) {
  if (actor.role !== "ADMIN" && actor.role !== "DISPATCHER") throw new ForbiddenException();
}

function record(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ConflictException();
  return body as Record<string, unknown>;
}

function text(value: unknown, maximum: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum)
    throw new ConflictException();
  return value.trim();
}

function categoryInput(body: unknown) {
  const input = record(body);
  if (Object.keys(input).some((key) => !["name", "description", "scopeDescription"].includes(key)))
    throw new ConflictException();
  return {
    description: text(input.description, 500),
    name: text(input.name, 120),
    scopeDescription: text(input.scopeDescription, 1000),
  };
}

function categoryPatch(body: unknown) {
  const input = record(body);
  const keys = Object.keys(input);
  if (
    !keys.length ||
    keys.some((key) => !["name", "description", "scopeDescription"].includes(key))
  )
    throw new ConflictException();
  return {
    ...("description" in input ? { description: text(input.description, 500) } : {}),
    ...("name" in input ? { name: text(input.name, 120) } : {}),
    ...("scopeDescription" in input
      ? { scopeDescription: text(input.scopeDescription, 1000) }
      : {}),
  };
}

function nameInput(body: unknown) {
  const input = record(body);
  if (Object.keys(input).length !== 1 || !("name" in input)) throw new ConflictException();
  return text(input.name, 120);
}

function rateInput(body: unknown): CatalogRateInput {
  const input = record(body);
  if (
    Object.keys(input).some(
      (key) =>
        !["categoryId", "zoneId", "currency", "amount", "validFrom", "validUntil"].includes(key),
    )
  )
    throw new ConflictException();
  const validFrom = date(input.validFrom);
  const validUntil = input.validUntil === undefined ? undefined : date(input.validUntil);
  if (
    input.currency !== "ARS" ||
    typeof input.amount !== "string" ||
    !/^\d{1,10}\.\d{2}$/.test(input.amount) ||
    Number(input.amount) <= 0 ||
    (validUntil && validUntil <= validFrom)
  )
    throw new ConflictException();
  return {
    amount: input.amount,
    categoryId: uuid(input.categoryId),
    currency: "ARS",
    validFrom,
    ...(validUntil ? { validUntil } : {}),
    zoneId: uuid(input.zoneId),
  };
}

function uuid(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
    throw new ConflictException();
  return value;
}

function date(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  )
    throw new ConflictException();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new ConflictException();
  return parsed;
}
