import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { correlationId } from "@pigar/observability";
import { DatabaseService } from "../database.service.js";
import type { RequestAddress, RequestMedia, ServiceRequest } from "../generated/prisma/client.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";
import { AddressNormalizerService, type ConfirmedAddress } from "./address-normalizer.service.js";

export type CreateRequestInput = {
  address: ConfirmedAddress;
  description: string;
  offerId: string;
};
type RequestRecord = ServiceRequest & { address: RequestAddress | null; media?: RequestMedia[] };
export type RequestView = {
  id: string;
  description: string;
  completeness: string;
  offer: { category: string; currency: string; price: string; version: number };
  address: RequestAddress | null;
  media: Array<{ id: string; kind: string; mime: string }>;
};

@Injectable()
export class RequestsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly normalizer: AddressNormalizerService,
  ) {}

  async create(
    actor: AuthenticatedActor,
    key: string,
    input: CreateRequestInput,
    requestId?: string,
  ): Promise<RequestView> {
    const address = await this.normalizer.normalize(input.address);
    const existing = await this.database.serviceRequest.findUnique({
      where: {
        clientProfileId_idempotencyKey: { clientProfileId: actor.profileId, idempotencyKey: key },
      },
      include: { address: true },
    });
    if (existing) {
      if (!samePayload(existing, input, address))
        throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
      return this.view(existing);
    }
    const at = new Date();
    const rate = await this.database.serviceRate.findFirst({
      where: {
        categoryId: input.offerId,
        status: "PUBLISHED",
        validFrom: { lte: at },
        AND: [{ OR: [{ validUntil: null }, { validUntil: { gt: at } }] }],
        category: { status: "PUBLISHED" },
        zone: { status: "ACTIVE" },
      },
      include: { category: true, zone: true },
    });
    if (!rate) throw new NotFoundException("OFFER_NOT_AVAILABLE");
    try {
      const created = await this.database.serviceRequest.create({
        data: {
          clientProfileId: actor.profileId,
          idempotencyKey: key,
          description: input.description,
          categoryId: rate.categoryId,
          categoryName: rate.category.name,
          categoryScope: rate.category.scopeDescription,
          zoneId: rate.zoneId,
          zoneName: rate.zone.name,
          currency: rate.currency,
          amount: rate.amount,
          rateVersion: rate.version,
          rateValidFrom: rate.validFrom,
          ...(rate.validUntil ? { rateValidUntil: rate.validUntil } : {}),
          address: { create: address },
        },
        include: { address: true },
      });
      await this.audit(actor.profileId, "request.created", created.id, requestId);
      return this.view(created);
    } catch (error: unknown) {
      if (isUnique(error)) {
        const concurrent = await this.database.serviceRequest.findUnique({
          where: {
            clientProfileId_idempotencyKey: {
              clientProfileId: actor.profileId,
              idempotencyKey: key,
            },
          },
          include: { address: true },
        });
        if (concurrent && samePayload(concurrent, input, address)) return this.view(concurrent);
        throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
      }
      throw error;
    }
  }

  async get(actor: AuthenticatedActor, id: string, requestId?: string) {
    const item = await this.database.serviceRequest.findUnique({
      where: { id },
      include: { address: true, media: true },
    });
    if (!item) throw new NotFoundException();
    this.authorize(actor, item.clientProfileId);
    if (actor.role !== "CLIENT")
      await this.audit(actor.profileId, "request.operational.read", id, requestId);
    return this.view(item);
  }

  async listOwn(actor: AuthenticatedActor) {
    if (actor.role !== "CLIENT") throw new NotFoundException();
    const items = await this.database.serviceRequest.findMany({
      where: { clientProfileId: actor.profileId },
      include: {
        workOrder: {
          include: { technician: true, transitions: { orderBy: { version: "asc" } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      items: items.map((item) => ({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
        completeness: item.completeness,
        offer: {
          category: item.categoryName,
          currency: item.currency,
          price: item.amount.toFixed(2),
        },
        order: item.workOrder
          ? {
              state: item.workOrder.state,
              version: item.workOrder.version,
              updatedAt: item.workOrder.updatedAt.toISOString(),
              technician: item.workOrder.technician
                ? { fullName: item.workOrder.technician.fullName }
                : null,
              history: item.workOrder.transitions.map((transition) => ({
                action: transition.action,
                toState: transition.toState,
                occurredAt: transition.createdAt.toISOString(),
              })),
            }
          : null,
      })),
    };
  }

  async media(actor: AuthenticatedActor, requestId: string, mediaId: string, correlation?: string) {
    const item = await this.database.requestMedia.findFirst({
      where: { id: mediaId, requestId },
      include: { request: true },
    });
    if (!item) throw new NotFoundException();
    this.authorize(actor, item.request.clientProfileId);
    if (actor.role !== "CLIENT")
      await this.audit(actor.profileId, "request.media.operational.read", requestId, correlation);
    return item;
  }

  async listOperational(actor: AuthenticatedActor, correlation?: string) {
    if (actor.role !== "ADMIN" && actor.role !== "DISPATCHER") throw new NotFoundException();
    const items = await this.database.serviceRequest.findMany({
      include: { address: true, media: true },
      orderBy: { createdAt: "desc" },
    });
    await this.audit(actor.profileId, "request.operational.list", "list", correlation);
    return { items: items.map((item) => this.view(item)) };
  }
  async auditUpload(actor: AuthenticatedActor, requestId: string, correlation?: string) {
    await this.audit(actor.profileId, "request.media.created", requestId, correlation);
  }

  private authorize(actor: AuthenticatedActor, owner: string) {
    if (actor.role === "CLIENT" && actor.profileId === owner) return;
    if (actor.role === "ADMIN" || actor.role === "DISPATCHER") return;
    throw new NotFoundException();
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
        eventType,
        outcome: "SUCCESS",
        correlationId: correlationId(requestId),
        metadata: { resourceId },
      },
    });
  }
  private view(item: RequestRecord): RequestView {
    return {
      id: item.id,
      description: item.description,
      completeness: item.completeness,
      offer: {
        category: item.categoryName,
        currency: item.currency,
        price: item.amount.toFixed(2),
        version: item.rateVersion,
      },
      address: item.address,
      media:
        item.media?.map((media) => ({
          id: media.id,
          kind: media.kind,
          mime: media.detectedMime,
        })) ?? [],
    };
  }
}

function samePayload(
  existing: RequestRecord,
  input: CreateRequestInput,
  normalized: ConfirmedAddress,
) {
  const address = existing.address;
  return (
    existing.description === input.description &&
    existing.categoryId === input.offerId &&
    !!address &&
    address.street === normalized.street &&
    address.number === normalized.number &&
    (address.neighborhood ?? undefined) === normalized.neighborhood &&
    (address.crossStreetOne ?? undefined) === normalized.crossStreetOne &&
    (address.crossStreetTwo ?? undefined) === normalized.crossStreetTwo &&
    (address.normalizedAddress ?? undefined) === normalized.normalizedAddress &&
    (address.latitude?.toFixed(6) ?? undefined) === normalized.latitude &&
    (address.longitude?.toFixed(6) ?? undefined) === normalized.longitude
  );
}

function isUnique(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
