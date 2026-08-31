import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderState, OrderTransitionAction, ORDER_TRANSITIONS } from "@pigar/contracts";
import { correlationId } from "@pigar/observability";
import type { WorkOrder, WorkOrderState, WorkOrderTransition } from "../generated/prisma/client.js";
import { DatabaseService } from "../database.service.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";

export type TechnicianInput = { fullName: string; phone?: string; status: "ACTIVE" | "INACTIVE" };
export type TransitionInput = {
  action: OrderTransitionAction;
  expectedVersion: number;
  reason?: string;
  technicianId?: string;
};

@Injectable()
export class OrdersService {
  constructor(private readonly database: DatabaseService) {}

  async technicians(actor: AuthenticatedActor) {
    this.requireOperator(actor);
    const items = await this.database.technician.findMany({ orderBy: { createdAt: "desc" } });
    await this.audit(actor, "technician.list", "list");
    return { items: items.map((item) => this.technicianView(item)) };
  }

  async createTechnician(actor: AuthenticatedActor, input: TechnicianInput, requestId?: string) {
    this.requireAdmin(actor);
    this.validateTechnician(input);
    const item = await this.database.technician.create({ data: input });
    await this.audit(actor, "technician.created", item.id, requestId);
    return this.technicianView(item);
  }

  async updateTechnician(
    actor: AuthenticatedActor,
    id: string,
    input: Partial<TechnicianInput>,
    requestId?: string,
  ) {
    this.requireAdmin(actor);
    const current = await this.database.technician.findUnique({ where: { id } });
    if (!current) throw new NotFoundException();
    const next: TechnicianInput = {
      fullName: input.fullName ?? current.fullName,
      status: input.status ?? current.status,
      ...((input.phone ?? current.phone) ? { phone: input.phone ?? current.phone! } : {}),
    };
    this.validateTechnician(next);
    const item = await this.database.technician.update({ where: { id }, data: input });
    await this.audit(actor, "technician.updated", id, requestId);
    return this.technicianView(item);
  }

  async assign(
    actor: AuthenticatedActor,
    requestId: string,
    technicianId: string,
    key: string,
    correlation?: string,
  ) {
    this.requireOperator(actor);
    try {
      const existing = await this.database.assignmentIdempotency.findUnique({
        where: {
          actorProfileId_idempotencyKey: { actorProfileId: actor.profileId, idempotencyKey: key },
        },
        include: {
          workOrder: {
            include: { technician: true, transitions: { orderBy: { version: "asc" } } },
          },
        },
      });
      if (existing) {
        if (existing.requestId !== requestId || existing.technicianId !== technicianId)
          throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
        if (!existing.workOrder) throw new ConflictException("ASSIGNMENT_IN_PROGRESS");
        return this.operationalView(existing.workOrder);
      }
      const result = await this.database.$transaction(async (tx) => {
        const request = await tx.serviceRequest.findUnique({ where: { id: requestId } });
        if (!request || request.completeness !== "READY_FOR_OPERATION")
          throw new ConflictException("REQUEST_NOT_READY_FOR_OPERATION");
        const technician = await tx.technician.findUnique({ where: { id: technicianId } });
        if (!technician || technician.status !== "ACTIVE" || !technician.phone)
          throw new ConflictException("TECHNICIAN_NOT_ASSIGNABLE");
        const reservation = await tx.assignmentIdempotency.create({
          data: { actorProfileId: actor.profileId, idempotencyKey: key, requestId, technicianId },
        });
        const order = await tx.workOrder.create({
          data: {
            requestId,
            technicianId,
            state: "TECNICO_ASIGNADO",
            version: 1,
            transitions: {
              create: {
                actorProfileId: actor.profileId,
                technicianId,
                action: OrderTransitionAction.ASSIGN_TECHNICIAN,
                fromState: "SOLICITADA",
                toState: "TECNICO_ASIGNADO",
                version: 1,
              },
            },
          },
          include: { technician: true, transitions: { orderBy: { version: "asc" } } },
        });
        await tx.assignmentIdempotency.update({
          where: { id: reservation.id },
          data: { workOrderId: order.id },
        });
        await tx.outboxEvent.create({
          data: {
            eventType: "work_order.assignment_changed",
            version: 1,
            aggregateType: "work_order",
            aggregateId: order.id,
            payload: { requestId },
          },
        });
        return order;
      });
      await this.audit(actor, "order.assigned", result.id, correlation);
      return this.operationalView(result);
    } catch (error) {
      if (isUnique(error)) {
        const retry = await this.database.assignmentIdempotency.findUnique({
          where: {
            actorProfileId_idempotencyKey: {
              actorProfileId: actor.profileId,
              idempotencyKey: key,
            },
          },
          include: {
            workOrder: {
              include: { technician: true, transitions: { orderBy: { version: "asc" } } },
            },
          },
        });
        if (
          retry?.workOrder &&
          retry.requestId === requestId &&
          retry.technicianId === technicianId
        )
          return this.operationalView(retry.workOrder);
        throw new ConflictException("ORDER_ALREADY_EXISTS");
      }
      throw error;
    }
  }

  async list(actor: AuthenticatedActor, correlation?: string) {
    this.requireOperator(actor);
    const items = await this.database.workOrder.findMany({
      include: { request: true, technician: true, transitions: { orderBy: { version: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    await this.audit(actor, "order.operational.list", "list", correlation);
    return { items: items.map((item) => this.operationalView(item)) };
  }

  async transition(
    actor: AuthenticatedActor,
    orderId: string,
    input: TransitionInput,
    correlation?: string,
  ) {
    this.requireOperator(actor);
    let transition;
    try {
      transition = await this.database.$transaction(async (tx) => {
        const order = await tx.workOrder.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException();
        if (order.version !== input.expectedVersion)
          throw new ConflictException("ORDER_VERSION_CONFLICT");
        const allowed = ORDER_TRANSITIONS.find(
          (item) => item.from === (order.state as OrderState) && item.action === input.action,
        );
        if (
          !allowed ||
          allowed.action === OrderTransitionAction.ASSIGN_TECHNICIAN ||
          allowed.action === OrderTransitionAction.CREATE_FIXED_PAYMENT
        )
          throw new ConflictException("ORDER_TRANSITION_INVALID");
        if (allowed.requiresReason && !input.reason)
          throw new ConflictException("ORDER_REASON_REQUIRED");
        let technicianId = order.technicianId;
        if (input.action === OrderTransitionAction.REASSIGN_TECHNICIAN) {
          if (!input.technicianId) throw new ConflictException("TECHNICIAN_REQUIRED");
          const technician = await tx.technician.findUnique({ where: { id: input.technicianId } });
          if (!technician || technician.status !== "ACTIVE" || !technician.phone)
            throw new ConflictException("TECHNICIAN_NOT_ASSIGNABLE");
          technicianId = technician.id;
        } else if (input.technicianId) throw new ConflictException("TECHNICIAN_NOT_ALLOWED");
        const version = order.version + 1;
        const target = allowed.to as unknown as WorkOrderState;
        const updated = await tx.workOrder.update({
          where: { id: orderId },
          data: {
            state: target,
            technicianId,
            version,
            transitions: {
              create: {
                actorProfileId: actor.profileId,
                technicianId,
                action: input.action,
                fromState: order.state,
                toState: target,
                ...(input.reason ? { reason: input.reason } : {}),
                version,
              },
            },
          },
          include: { technician: true, transitions: { orderBy: { version: "asc" } } },
        });
        const eventType =
          input.action === OrderTransitionAction.REASSIGN_TECHNICIAN
            ? "work_order.assignment_changed"
            : input.action === OrderTransitionAction.MARK_EN_ROUTE
              ? "work_order.en_route"
              : input.action === OrderTransitionAction.CANCEL
                ? "work_order.cancelled"
                : undefined;
        if (eventType)
          await tx.outboxEvent.create({
            data: {
              eventType,
              version: 1,
              aggregateType: "work_order",
              aggregateId: order.id,
              payload: { requestId: order.requestId },
            },
          });
        return updated;
      });
    } catch (error) {
      if (isUnique(error)) throw new ConflictException("ORDER_VERSION_CONFLICT");
      throw error;
    }
    await this.audit(actor, "order.transitioned", orderId, correlation);
    return this.operationalView(transition);
  }

  async customerView(actor: AuthenticatedActor, requestId: string) {
    const order = await this.database.workOrder.findUnique({
      where: { requestId },
      include: { request: true, technician: true, transitions: { orderBy: { version: "asc" } } },
    });
    if (!order || (actor.role === "CLIENT" && order.request.clientProfileId !== actor.profileId))
      throw new NotFoundException();
    if (actor.role !== "CLIENT") this.requireOperator(actor);
    if (actor.role === "CLIENT") return this.safeCustomerView(order);
    return this.operationalView(order);
  }

  private safeCustomerView(
    order: WorkOrder & {
      technician: { fullName: string } | null;
      transitions: WorkOrderTransition[];
    },
  ) {
    return {
      id: order.id,
      state: order.state,
      updatedAt: order.updatedAt.toISOString(),
      technician: order.technician ? { fullName: order.technician.fullName } : null,
      history: order.transitions.map((item) => ({
        action: item.action,
        fromState: item.fromState,
        toState: item.toState,
        occurredAt: item.createdAt.toISOString(),
      })),
    };
  }
  private operationalView(
    order: WorkOrder & {
      technician: { id: string; fullName: string; phone: string | null; status: string } | null;
      transitions: WorkOrderTransition[];
    },
  ) {
    return {
      id: order.id,
      requestId: order.requestId,
      state: order.state,
      version: order.version,
      updatedAt: order.updatedAt.toISOString(),
      technician: order.technician && this.technicianView(order.technician),
      history: order.transitions.map((item) => ({
        action: item.action,
        fromState: item.fromState,
        toState: item.toState,
        reason: item.reason,
        version: item.version,
        occurredAt: item.createdAt.toISOString(),
      })),
    };
  }
  private technicianView(item: {
    id: string;
    fullName: string;
    phone: string | null;
    status: string;
  }) {
    return { id: item.id, fullName: item.fullName, phone: item.phone, status: item.status };
  }
  private validateTechnician(input: TechnicianInput) {
    if (
      !input.fullName.trim() ||
      input.fullName.trim().length > 160 ||
      (input.phone !== undefined && !/^\+?[0-9 ()-]{7,32}$/.test(input.phone)) ||
      (input.status === "ACTIVE" && !input.phone)
    )
      throw new ConflictException("TECHNICIAN_INVALID");
  }
  private requireAdmin(actor: AuthenticatedActor) {
    if (actor.role !== "ADMIN") throw new NotFoundException();
  }
  private requireOperator(actor: AuthenticatedActor) {
    if (actor.role !== "ADMIN" && actor.role !== "DISPATCHER") throw new NotFoundException();
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

function isUnique(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
