import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { correlationId, createLogger } from "@pigar/observability";
import { DatabaseService } from "../database.service.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";

const reasons = [
  "CALIDAD_DEL_TRABAJO",
  "PUNTUALIDAD",
  "TRATO_Y_COMUNICACION",
  "CLARIDAD_DEL_PROCESO",
  "EXPERIENCIA_GENERAL",
  "OTRO",
] as const;
const types = [
  "RESULTADO_NO_ESPERADO",
  "PROBLEMA_REAPARECIO",
  "TRABAJO_INCOMPLETO",
  "DANIO_REPORTADO",
  "CONSULTA_SOBRE_COBRO",
] as const;
type RatingInput = { stars: number; reason: (typeof reasons)[number]; otherMessage?: string };
type IncidentInput = { type: (typeof types)[number] };
type Page = { cursor: string | undefined; limit: number };
const incidentIncludes = {
  workOrder: { select: { requestId: true } },
  transitions: {
    orderBy: { sequence: "asc" },
    include: { actor: { select: { role: true } } },
  },
} as const;
const logger = createLogger({ environment: process.env.NODE_ENV ?? "development", service: "api" });
@Injectable()
export class AftercareService {
  private readonly rateWindows = new Map<string, { startedAt: number; count: number }>();
  private readonly ipRateWindows = new Map<string, { startedAt: number; count: number }>();
  constructor(private readonly database: DatabaseService) {}
  async createRating(
    actor: AuthenticatedActor,
    requestId: string,
    key: string,
    input: RatingInput,
    sourceIp?: string,
  ) {
    const startedAt = Date.now();
    try {
      this.client(actor);
      this.limit(actor.profileId, "write");
      this.limitIp(sourceIp);
      const order = await this.ownClosedOrder(actor, requestId);
      const hash = fingerprint({ requestId, input });
      const existing = await this.database.aftercareIdempotency.findUnique({
        where: {
          actorProfileId_scope_idempotencyKey: {
            actorProfileId: actor.profileId,
            scope: "rating",
            idempotencyKey: key,
          },
        },
      });
      if (existing) {
        if (existing.payloadHash !== hash)
          throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
        const rating =
          existing.resultId &&
          (await this.database.orderRating.findUnique({ where: { id: existing.resultId } }));
        if (rating)
          return this.complete(
            actor,
            "aftercare.rating.create",
            requestId,
            replayed(ratingView(rating, false)),
            startedAt,
          );
        throw new ConflictException("AFTERCARE_IN_PROGRESS");
      }
      try {
        const result = await this.database.$transaction(async (tx) => {
          const reservation = await tx.aftercareIdempotency.create({
            data: {
              actorProfileId: actor.profileId,
              scope: "rating",
              idempotencyKey: key,
              payloadHash: hash,
            },
          });
          const rating = await tx.orderRating.create({
            data: { workOrderId: order.id, clientProfileId: actor.profileId, ...input },
          });
          await tx.aftercareIdempotency.update({
            where: { id: reservation.id },
            data: { resultId: rating.id },
          });
          return ratingView(rating, false);
        });
        return this.complete(actor, "aftercare.rating.create", requestId, result, startedAt);
      } catch (e) {
        const replay =
          unique(e) && (await this.replay(actor.profileId, "rating", key, hash, "rating"));
        if (replay)
          return this.complete(
            actor,
            "aftercare.rating.create",
            requestId,
            replayed(replay),
            startedAt,
          );
        if (unique(e)) throw new ConflictException("RATING_ALREADY_EXISTS");
        throw e;
      }
    } catch (e) {
      await this.failure(actor, "aftercare.rating.create", requestId, e, startedAt);
      throw e;
    }
  }
  async rating(actor: AuthenticatedActor, requestId: string) {
    const startedAt = Date.now();
    try {
      this.limit(actor.profileId, "read");
      const order = await this.orderForRead(actor, requestId);
      const item = await this.database.orderRating.findUnique({ where: { workOrderId: order.id } });
      if (!item) throw new NotFoundException();
      return this.complete(
        actor,
        "aftercare.rating.read",
        requestId,
        ratingView(item, true),
        startedAt,
      );
    } catch (e) {
      await this.failure(actor, "aftercare.rating.read", requestId, e, startedAt);
      throw e;
    }
  }
  async createIncident(
    actor: AuthenticatedActor,
    requestId: string,
    key: string,
    input: IncidentInput,
    sourceIp?: string,
  ) {
    const startedAt = Date.now();
    try {
      this.client(actor);
      this.limit(actor.profileId, "write");
      this.limitIp(sourceIp);
      const order = await this.ownClosedOrder(actor, requestId);
      const hash = fingerprint({ requestId, input });
      const found = await this.database.aftercareIdempotency.findUnique({
        where: {
          actorProfileId_scope_idempotencyKey: {
            actorProfileId: actor.profileId,
            scope: "incident.open",
            idempotencyKey: key,
          },
        },
      });
      if (found) {
        if (found.payloadHash !== hash) throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
        const incident =
          found.resultId &&
          (await this.database.aftercareIncident.findUnique({
            where: { id: found.resultId },
            include: incidentIncludes,
          }));
        if (incident)
          return this.complete(
            actor,
            "aftercare.incident.open",
            requestId,
            replayed(incidentView(incident)),
            startedAt,
          );
        throw new ConflictException("AFTERCARE_IN_PROGRESS");
      }
      try {
        const result = await this.database.$transaction(async (tx) => {
          const reservation = await tx.aftercareIdempotency.create({
            data: {
              actorProfileId: actor.profileId,
              scope: "incident.open",
              idempotencyKey: key,
              payloadHash: hash,
            },
          });
          const incident = await tx.aftercareIncident.create({
            data: {
              workOrderId: order.id,
              clientProfileId: actor.profileId,
              type: input.type,
              transitions: {
                create: {
                  sequence: 1,
                  action: "OPEN",
                  toStatus: "ABIERTA",
                  actorProfileId: actor.profileId,
                },
              },
            },
            include: incidentIncludes,
          });
          await tx.aftercareIdempotency.update({
            where: { id: reservation.id },
            data: { resultId: incident.id },
          });
          return incidentView(incident);
        });
        await this.activeIncidentMetrics();
        return this.complete(actor, "aftercare.incident.open", requestId, result, startedAt);
      } catch (e) {
        const replay =
          unique(e) && (await this.replay(actor.profileId, "incident.open", key, hash, "incident"));
        if (replay)
          return this.complete(
            actor,
            "aftercare.incident.open",
            requestId,
            replayed(replay),
            startedAt,
          );
        if (unique(e)) throw new ConflictException("INCIDENT_ALREADY_ACTIVE");
        throw e;
      }
    } catch (e) {
      await this.failure(actor, "aftercare.incident.open", requestId, e, startedAt);
      throw e;
    }
  }
  async incidents(actor: AuthenticatedActor, requestId: string, page: Page) {
    const startedAt = Date.now();
    try {
      this.limit(actor.profileId, "read");
      const order = await this.orderForRead(actor, requestId);
      await this.assertCursor(page, { workOrderId: order.id });
      const items = (await this.database.aftercareIncident.findMany({
        where: { workOrderId: order.id },
        include: incidentIncludes,
        ...(this.page(page, "createdAt") as object),
      } as never)) as unknown as Array<Parameters<typeof incidentView>[0]>;
      return this.complete(
        actor,
        "aftercare.incident.list",
        requestId,
        incidentPage(items, page.limit),
        startedAt,
      );
    } catch (e) {
      await this.failure(actor, "aftercare.incident.list", requestId, e, startedAt);
      throw e;
    }
  }
  async adminIncidents(
    actor: AuthenticatedActor,
    status: string | undefined,
    type: string | undefined,
    page: Page,
  ) {
    const startedAt = Date.now();
    try {
      this.operator(actor);
      this.limit(actor.profileId, "read");
      if (status && !["ABIERTA", "EN_TRIAGE", "CERRADA"].includes(status))
        throw new BadRequestException("INCIDENT_STATUS_INVALID");
      if (type && !types.includes(type as IncidentInput["type"]))
        throw new BadRequestException("INCIDENT_TYPE_INVALID");
      await this.assertCursor(page, {
        ...(status ? { status: status as "ABIERTA" | "EN_TRIAGE" | "CERRADA" } : {}),
        ...(type ? { type: type as (typeof types)[number] } : {}),
      });
      const items = (await this.database.aftercareIncident.findMany({
        where: {
          ...(status ? { status: status as "ABIERTA" | "EN_TRIAGE" | "CERRADA" } : {}),
          ...(type ? { type: type as (typeof types)[number] } : {}),
        },
        include: incidentIncludes,
        ...(this.page(page, "createdAt") as object),
      } as never)) as unknown as Array<Parameters<typeof incidentView>[0]>;
      return this.complete(
        actor,
        "aftercare.incident.list",
        "list",
        incidentPage(items, page.limit),
        startedAt,
      );
    } catch (e) {
      await this.failure(actor, "aftercare.incident.list", "list", e, startedAt);
      throw e;
    }
  }
  async adminOrder(actor: AuthenticatedActor, orderId: string, page: Page) {
    const startedAt = Date.now();
    try {
      this.operator(actor);
      this.limit(actor.profileId, "read");
      const order = await this.database.workOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException();
      if (order.state !== "CERRADA") throw new ConflictException("ORDER_NOT_CLOSED");
      await this.assertCursor(page, { workOrderId: orderId });
      const [rating, incidents] = await Promise.all([
        this.database.orderRating.findUnique({ where: { workOrderId: orderId } }),
        this.database.aftercareIncident.findMany({
          where: { workOrderId: orderId },
          include: incidentIncludes,
          ...(this.page(page, "createdAt") as object),
        }),
      ]);
      return this.complete(
        actor,
        "aftercare.order.read",
        orderId,
        {
          orderId: order.id,
          orderState: order.state,
          rating: rating ? ratingView(rating, true) : null,
          incidents: incidentPage(
            incidents as Array<Parameters<typeof incidentView>[0]>,
            page.limit,
          ),
        },
        startedAt,
      );
    } catch (e) {
      await this.failure(actor, "aftercare.order.read", orderId, e, startedAt);
      throw e;
    }
  }
  async transition(
    actor: AuthenticatedActor,
    id: string,
    key: string,
    input: { action: "START_TRIAGE" | "CLOSE"; expectedVersion: number },
  ) {
    const startedAt = Date.now();
    try {
      this.operator(actor);
      this.limit(actor.profileId, "transition");
      const hash = fingerprint({ incidentId: id, input });
      const old = await this.database.aftercareIdempotency.findUnique({
        where: {
          actorProfileId_scope_idempotencyKey: {
            actorProfileId: actor.profileId,
            scope: "incident.transition",
            idempotencyKey: key,
          },
        },
      });
      if (old) {
        if (old.payloadHash !== hash) throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
        const item =
          old.resultId &&
          (await this.database.aftercareIncident.findUnique({
            where: { id: old.resultId },
            include: incidentIncludes,
          }));
        if (item)
          return this.complete(
            actor,
            "aftercare.incident.transition",
            id,
            replayed(incidentView(item)),
            startedAt,
          );
        throw new ConflictException("AFTERCARE_IN_PROGRESS");
      }
      try {
        const result = await this.database.$transaction(async (tx) => {
          const reservation = await tx.aftercareIdempotency.create({
            data: {
              actorProfileId: actor.profileId,
              scope: "incident.transition",
              idempotencyKey: key,
              payloadHash: hash,
            },
          });
          const incident = await tx.aftercareIncident.findUnique({
            where: { id },
            include: { transitions: true },
          });
          if (!incident || incident.version !== input.expectedVersion)
            throw new ConflictException("INCIDENT_VERSION_CONFLICT");
          const next =
            input.action === "START_TRIAGE" && incident.status === "ABIERTA"
              ? "EN_TRIAGE"
              : input.action === "CLOSE" && incident.status === "EN_TRIAGE"
                ? "CERRADA"
                : undefined;
          if (!next) throw new ConflictException("INCIDENT_TRANSITION_INVALID");
          const updated = await tx.aftercareIncident.update({
            where: { id_version: { id, version: input.expectedVersion } },
            data: {
              status: next,
              version: { increment: 1 },
              ...(next === "CERRADA" ? { closedAt: new Date() } : {}),
              transitions: {
                create: {
                  sequence: incident.transitions.length + 1,
                  action: input.action,
                  fromStatus: incident.status,
                  toStatus: next,
                  actorProfileId: actor.profileId,
                },
              },
            },
            include: incidentIncludes,
          });
          await tx.aftercareIdempotency.update({
            where: { id: reservation.id },
            data: { resultId: updated.id },
          });
          return incidentView(updated);
        });
        await this.activeIncidentMetrics();
        return this.complete(actor, "aftercare.incident.transition", id, result, startedAt);
      } catch (e) {
        const replay =
          (unique(e) || versionConflict(e) || e instanceof ConflictException) &&
          (await this.replay(actor.profileId, "incident.transition", key, hash, "incident"));
        if (replay)
          return this.complete(
            actor,
            "aftercare.incident.transition",
            id,
            replayed(replay),
            startedAt,
          );
        if (versionConflict(e)) throw new ConflictException("INCIDENT_VERSION_CONFLICT");
        throw e;
      }
    } catch (e) {
      await this.failure(actor, "aftercare.incident.transition", id, e, startedAt);
      throw e;
    }
  }
  private client(a: AuthenticatedActor) {
    if (a.role !== "CLIENT") throw new ForbiddenException();
  }
  private operator(a: AuthenticatedActor) {
    if (a.role !== "ADMIN" && a.role !== "DISPATCHER") throw new ForbiddenException();
  }
  private limit(profileId: string, kind: "read" | "write" | "transition") {
    const maximum = kind === "read" ? 120 : kind === "write" ? 10 : 60;
    const key = `${kind}:${profileId}`;
    const now = Date.now();
    const window = this.rateWindows.get(key);
    if (!window || now - window.startedAt >= 60_000) {
      this.rateWindows.set(key, { startedAt: now, count: 1 });
      return;
    }
    if (window.count >= maximum) throw this.rateLimited(window);
    window.count += 1;
  }
  private limitIp(sourceIp: string | undefined) {
    const key = sourceIp?.trim() || "unknown";
    const now = Date.now();
    const window = this.ipRateWindows.get(key);
    if (!window || now - window.startedAt >= 60_000) {
      this.ipRateWindows.set(key, { startedAt: now, count: 1 });
      return;
    }
    if (window.count >= 30) throw this.rateLimited(window);
    window.count += 1;
  }
  private async audit(
    actor: AuthenticatedActor,
    eventType: string,
    resourceId: string,
    outcome: "SUCCESS" | "CONFLICT" | "RATE_LIMITED" | "REJECTED" = "SUCCESS",
  ) {
    await this.database.accessAuditEvent.create({
      data: {
        actorProfileId: actor.profileId,
        eventType,
        outcome,
        correlationId: correlationId(undefined),
        metadata: { resourceId },
      },
    });
  }
  private async complete<T>(
    actor: AuthenticatedActor,
    event: string,
    resourceId: string,
    value: T,
    startedAt: number,
  ): Promise<T> {
    await this.audit(actor, event, resourceId);
    logger.info("aftercare.metric.operation", undefined, {
      code: `${event.toUpperCase().replaceAll(".", "_")}_OK`,
      duration_ms: Date.now() - startedAt,
      metric_value: 1,
    });
    return value;
  }
  private async failure(
    actor: AuthenticatedActor,
    event: string,
    resourceId: string,
    error: unknown,
    startedAt: number,
  ) {
    const conflict = error instanceof ConflictException;
    const rateLimited = error instanceof RateLimitedException;
    logger.warn("aftercare.metric.operation", undefined, {
      code: rateLimited
        ? "AFTERCARE_RATE_LIMITED"
        : conflict
          ? "AFTERCARE_CONFLICT"
          : `${event.toUpperCase().replaceAll(".", "_")}_REJECTED`,
      duration_ms: Date.now() - startedAt,
      metric_value: 1,
    });
    const outcome = rateLimited ? "RATE_LIMITED" : conflict ? "CONFLICT" : "REJECTED";
    try {
      await this.audit(actor, event, resourceId, outcome);
    } catch {
      logger.warn("aftercare.metric.audit_failure", undefined, {
        code: "AFTERCARE_AUDIT_REJECTED",
        metric_value: 1,
      });
    }
  }
  private async activeIncidentMetrics() {
    for (const status of ["ABIERTA", "EN_TRIAGE"] as const) {
      const count = await this.database.aftercareIncident.count({ where: { status } });
      logger.info("aftercare.metric.active_incidents", undefined, {
        code: `AFTERCARE_ACTIVE_${status}`,
        metric_value: count,
      });
    }
  }
  private rateLimited(window: { startedAt: number }) {
    const retryAfter = Math.max(1, Math.ceil((60_000 - (Date.now() - window.startedAt)) / 1000));
    logger.warn("aftercare.metric.operation", undefined, {
      code: "AFTERCARE_RATE_LIMITED",
      metric_value: 1,
    });
    return new RateLimitedException(retryAfter);
  }
  private async replay(
    actorProfileId: string,
    scope: string,
    key: string,
    hash: string,
    kind: "rating" | "incident",
  ) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const row = await this.database.aftercareIdempotency.findUnique({
        where: {
          actorProfileId_scope_idempotencyKey: { actorProfileId, scope, idempotencyKey: key },
        },
      });
      if (row?.payloadHash && row.payloadHash !== hash)
        throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
      if (row?.resultId) {
        if (kind === "rating") {
          const item = await this.database.orderRating.findUnique({ where: { id: row.resultId } });
          if (item) return ratingView(item, false);
        } else {
          const item = await this.database.aftercareIncident.findUnique({
            where: { id: row.resultId },
            include: incidentIncludes,
          });
          if (item) return incidentView(item);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return undefined;
  }
  private page(page: Page, dateField: "createdAt" | "updatedAt"): object {
    const cursor = decodeCursor(page.cursor);
    return {
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      orderBy: [{ [dateField]: "desc" }, { id: "desc" }],
      take: page.limit + 1,
    } as object;
  }
  private async assertCursor(page: Page, where: Record<string, unknown>) {
    const cursor = decodeCursor(page.cursor);
    if (!cursor) return;
    const item = await this.database.aftercareIncident.findFirst({
      where: { ...where, id: cursor.id } as never,
      select: { id: true },
    });
    if (!item) throw new BadRequestException("AFTERCARE_CURSOR_INVALID");
  }
  private async ownClosedOrder(a: AuthenticatedActor, requestId: string) {
    const order = await this.database.workOrder.findFirst({
      where: { requestId, request: { clientProfileId: a.profileId } },
    });
    if (!order) throw new NotFoundException();
    if (order.state !== "CERRADA") throw new ConflictException("ORDER_NOT_CLOSED");
    return order;
  }
  private async orderForRead(a: AuthenticatedActor, requestId: string) {
    this.client(a);
    return this.ownClosedOrder(a, requestId);
  }
}
export class RateLimitedException extends HttpException {
  readonly retryAfter: string;
  constructor(retryAfter: number) {
    super("AFTERCARE_RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS);
    this.retryAfter = String(retryAfter);
  }
}
function fingerprint(input: object) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
function unique(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
function versionConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2025"
  );
}
function ratingView(
  item: { id: string; stars: number; reason: string; otherMessage: string | null; createdAt: Date },
  detail: boolean,
) {
  return {
    id: item.id,
    stars: item.stars,
    reason: item.reason,
    ...(detail ? { otherMessage: item.otherMessage } : {}),
    createdAt: item.createdAt.toISOString(),
  };
}
function replayed<T extends object>(value: T): T {
  Object.defineProperty(value, "replayed", { value: true, enumerable: false });
  return value;
}
function incidentView(item: {
  id: string;
  workOrder: { requestId: string };
  type: string;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  transitions: Array<{
    sequence: number;
    action: string;
    fromStatus: string | null;
    toStatus: string;
    actor: { role: "CLIENT" | "ADMIN" | "DISPATCHER" };
    createdAt: Date;
  }>;
}) {
  return {
    id: item.id,
    requestId: item.workOrder.requestId,
    type: item.type,
    status: item.status,
    version: item.version,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    closedAt: item.closedAt?.toISOString() ?? null,
    history: item.transitions.map((x) => ({
      sequence: x.sequence,
      action: x.action,
      fromStatus: x.fromStatus,
      toStatus: x.toStatus,
      actorRole: x.actor.role,
      createdAt: x.createdAt.toISOString(),
    })),
  };
}
function incidentPage(items: Array<Parameters<typeof incidentView>[0]>, limit: number) {
  const page = items.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(incidentView),
    nextCursor: items.length > limit && last ? encodeCursor(last.id) : null,
  };
}
function encodeCursor(id: string) {
  return Buffer.from(JSON.stringify({ id }), "utf8").toString("base64url");
}
function decodeCursor(value: string | undefined) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed.id !== "string" || !/^[0-9a-f-]{36}$/i.test(parsed.id))
      throw new Error();
    return parsed as { id: string };
  } catch {
    throw new BadRequestException("AFTERCARE_CURSOR_INVALID");
  }
}
export function validateRating(body: unknown): RatingInput {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new BadRequestException("RATING_BODY_INVALID");
  const x = body as Record<string, unknown>;
  if (
    Object.keys(x).some((k) => !["stars", "reason", "otherMessage"].includes(k)) ||
    !Number.isInteger(x.stars) ||
    (x.stars as number) < 1 ||
    (x.stars as number) > 5 ||
    !reasons.includes(x.reason as RatingInput["reason"])
  )
    throw new BadRequestException("RATING_BODY_INVALID");
  if (x.reason === "OTRO") {
    if (typeof x.otherMessage !== "string") throw new BadRequestException("RATING_OTHER_INVALID");
    const value = x.otherMessage.normalize("NFKC").trim();
    if (
      !value ||
      [...value].length > 100 ||
      /[<>\p{Cc}]|\b(?:https?:\/\/|www\.|data:|mailto:|[a-z0-9][a-z0-9-]*\.[a-z]{2,})/iu.test(value)
    )
      throw new BadRequestException("RATING_OTHER_INVALID");
    return { stars: x.stars as number, reason: "OTRO", otherMessage: value };
  }
  if ("otherMessage" in x) throw new BadRequestException("RATING_OTHER_INVALID");
  return { stars: x.stars as number, reason: x.reason as RatingInput["reason"] };
}
export function validateIncident(body: unknown): IncidentInput {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new BadRequestException("INCIDENT_BODY_INVALID");
  const x = body as Record<string, unknown>;
  if (Object.keys(x).length !== 1 || !types.includes(x.type as IncidentInput["type"]))
    throw new BadRequestException("INCIDENT_BODY_INVALID");
  return { type: x.type as IncidentInput["type"] };
}
