import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { correlationId, createLogger } from "@pigar/observability";
import { DatabaseService } from "../database.service.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";
import { NOTIFICATION_TEMPLATES } from "./notification-templates.js";

const logger = createLogger({
  environment: process.env.NODE_ENV ?? "development",
  service: "api",
});
@Injectable()
export class NotificationsService {
  private readonly requestWindows = new Map<string, { startsAt: number; count: number }>();
  constructor(private readonly database: DatabaseService) {}

  async list(
    actor: AuthenticatedActor,
    cursor?: string,
    requestedLimit?: string,
    requestId?: string,
  ) {
    const startedAt = Date.now();
    this.requireClient(actor);
    this.limit(actor.profileId);
    const limit = requestedLimit === undefined ? 20 : Number(requestedLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new BadRequestException("NOTIFICATION_LIMIT_INVALID");
    const decoded = cursor ? decodeCursor(cursor) : undefined;
    const items = await this.database.transactionalNotification.findMany({
      where: {
        recipientProfileId: actor.profileId,
        ...(decoded
          ? {
              OR: [
                { createdAt: { lt: decoded.createdAt } },
                { createdAt: decoded.createdAt, id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const page = items.slice(0, limit);
    const unreadCount = await this.database.transactionalNotification.count({
      where: { recipientProfileId: actor.profileId, readAt: null },
    });
    await this.audit(actor, "notification.list", "list", requestId);
    const result = {
      items: page.map((item) => this.view(item)),
      unreadCount,
      nextCursor: items.length > limit ? encodeCursor(page.at(-1)!) : null,
    };
    logger.info("notification.metric.list", requestId, {
      code: "NOTIFICATION_LIST_OK",
      duration_ms: Date.now() - startedAt,
    });
    return result;
  }

  async markRead(actor: AuthenticatedActor, id: string, requestId?: string) {
    const startedAt = Date.now();
    this.requireClient(actor);
    this.limit(actor.profileId);
    if (!uuid(id)) throw new BadRequestException("NOTIFICATION_ID_INVALID");
    const marked = await this.database.$queryRaw<
      Array<{ id: string }>
    >`UPDATE "transactional_notification" SET "readAt" = COALESCE("readAt", CURRENT_TIMESTAMP) WHERE "id" = ${id}::uuid AND "recipientProfileId" = ${actor.profileId}::uuid RETURNING "id"`;
    if (!marked[0]) throw new NotFoundException();
    const item = await this.database.transactionalNotification.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();
    await this.audit(actor, "notification.read", id, requestId);
    const result = this.view(item);
    logger.info("notification.metric.read", requestId, {
      code: "NOTIFICATION_READ_OK",
      duration_ms: Date.now() - startedAt,
    });
    return result;
  }

  private view(item: {
    id: string;
    eventType: string;
    requestId: string;
    createdAt: Date;
    readAt: Date | null;
  }) {
    const template = Object.values(NOTIFICATION_TEMPLATES).find(
      (candidate) => candidate.type === item.eventType,
    );
    if (!template) throw new NotFoundException();
    return {
      id: item.id,
      type: item.eventType,
      title: template.title,
      summary: template.summary,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt?.toISOString() ?? null,
      target: { kind: "REQUEST_DETAIL", requestId: item.requestId },
    };
  }
  private requireClient(actor: AuthenticatedActor) {
    if (actor.role !== "CLIENT") throw new ForbiddenException();
  }
  private limit(profileId: string) {
    const now = Date.now();
    const window = this.requestWindows.get(profileId);
    if (!window || now - window.startsAt >= 60_000) {
      this.requestWindows.set(profileId, { startsAt: now, count: 1 });
      return;
    }
    if (window.count >= 60)
      throw new HttpException("NOTIFICATION_RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS);
    window.count += 1;
  }
  private async audit(
    actor: AuthenticatedActor,
    eventType: string,
    resourceId: string,
    requestId?: string,
  ) {
    await this.database.accessAuditEvent.create({
      data: {
        actorProfileId: actor.profileId,
        eventType,
        outcome: "SUCCESS",
        correlationId: correlationId(requestId),
        metadata: { resourceId },
      },
    });
  }
}
function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function encodeCursor(item: { createdAt: Date; id: string }) {
  return Buffer.from(JSON.stringify({ c: item.createdAt.toISOString(), i: item.id })).toString(
    "base64url",
  );
}
function decodeCursor(value: string) {
  try {
    if (value.length > 512) throw new Error();
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      !decoded ||
      typeof decoded.c !== "string" ||
      !uuid(decoded.i) ||
      Number.isNaN(Date.parse(decoded.c))
    )
      throw new Error();
    return { createdAt: new Date(decoded.c), id: decoded.i as string };
  } catch {
    throw new BadRequestException("NOTIFICATION_CURSOR_INVALID");
  }
}
