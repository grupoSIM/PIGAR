/* eslint-disable @typescript-eslint/no-explicit-any -- Las inclusiones relacionales de Prisma se validan en las pruebas de integración; el tipo generado no expresa transacciones de forma genérica. */
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { OrderTransitionAction } from "@pigar/contracts";
import { correlationId } from "@pigar/observability";
import { DatabaseService } from "../database.service.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";

export type ResolutionInput = {
  outcome: "RESUELTO_EN_VISITA" | "REQUIERE_PRESUPUESTO";
  summary: string;
  expectedOrderVersion: number;
};
export type ProviderPayment = {
  id: string;
  status: "approved" | "pending" | "rejected" | "cancelled";
  externalReference: string;
  currency: string;
  amount: string;
};
export type PaymentProvider = {
  createPreference(input: {
    title: string;
    externalReference: string;
    amount: string;
    currency: "ARS";
  }): Promise<{ checkoutUrl: string }>;
  getPayment(id: string): Promise<ProviderPayment>;
  searchPayments(reference: string): Promise<ProviderPayment[]>;
  findPreference(reference: string): Promise<{ checkoutUrl: string } | undefined>;
};
export const PAYMENT_PROVIDER = "PAYMENT_PROVIDER";

@Injectable()
export class BillingService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async resolve(
    actor: AuthenticatedActor,
    orderId: string,
    key: string,
    input: ResolutionInput,
    requestId?: string,
  ) {
    this.requireOperator(actor);
    const payloadHash = hash(JSON.stringify(input));
    const db: any = this.database;
    let result;
    try {
      result = await db.$transaction(async (tx: any) => {
        const prior = await tx.resolutionCommand.findUnique({
          where: {
            actorProfileId_idempotencyKey: { actorProfileId: actor.profileId, idempotencyKey: key },
          },
          include: { resolution: { include: { workOrder: { include: { charge: true } } } } },
        });
        if (prior) {
          if (prior.workOrderId !== orderId || prior.payloadHash !== payloadHash)
            throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
          if (!prior.resolution) throw new ConflictException("RESOLUTION_IN_PROGRESS");
          return prior.resolution.workOrder;
        }
        const order = await tx.workOrder.findUnique({
          where: { id: orderId },
          include: { request: true, charge: true },
        });
        if (!order) throw new NotFoundException();
        if (order.state !== "TRABAJO_FINALIZADO" || order.version !== input.expectedOrderVersion)
          throw new ConflictException("ORDER_VERSION_CONFLICT");
        if (order.charge || order.request.currency !== "ARS")
          throw new ConflictException("CHARGE_INVALID");
        const command = await tx.resolutionCommand.create({
          data: {
            actorProfileId: actor.profileId,
            idempotencyKey: key,
            workOrderId: orderId,
            payloadHash,
          },
        });
        const version = order.version + 1;
        const resolution = await tx.resolution.create({
          data: { workOrderId: orderId, outcome: input.outcome, summary: input.summary },
        });
        const updated = await tx.workOrder.update({
          where: { id: orderId },
          data: {
            state: "PENDIENTE_PAGO",
            version,
            charge: {
              create: {
                categoryName: order.request.categoryName,
                offerVersion: order.request.rateVersion,
                currency: "ARS",
                amount: order.request.amount,
              },
            },
            transitions: {
              create: {
                actorProfileId: actor.profileId,
                action: OrderTransitionAction.CREATE_FIXED_PAYMENT,
                fromState: "TRABAJO_FINALIZADO",
                toState: "PENDIENTE_PAGO",
                version,
              },
            },
          },
          include: { charge: true, resolution: true },
        });
        await tx.resolutionCommand.update({
          where: { id: command.id },
          data: { resolutionId: resolution.id },
        });
        return updated;
      });
    } catch (error) {
      if (isUnique(error)) {
        const retry = await db.resolutionCommand.findUnique({
          where: {
            actorProfileId_idempotencyKey: { actorProfileId: actor.profileId, idempotencyKey: key },
          },
          include: { resolution: { include: { workOrder: { include: { charge: true } } } } },
        });
        if (retry?.resolution && retry.workOrderId === orderId && retry.payloadHash === payloadHash)
          result = retry.resolution.workOrder;
        else throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH");
      } else throw error;
    }
    await this.audit(actor, "billing.resolved", orderId, requestId);
    return this.operatorView(result);
  }

  async view(actor: AuthenticatedActor, orderId: string) {
    const db: any = this.database;
    const order = await db.workOrder.findUnique({
      where: { id: orderId },
      include: {
        request: true,
        resolution: true,
        charge: { include: { attempts: { orderBy: { sequence: "desc" } }, conformity: true } },
      },
    });
    if (!order || (actor.role === "CLIENT" && order.request.clientProfileId !== actor.profileId))
      throw new NotFoundException();
    if (actor.role !== "CLIENT") this.requireOperator(actor);
    if (!order.charge || !order.resolution) throw new NotFoundException();
    const attempt = order.charge.attempts[0];
    return {
      requestId: order.requestId,
      orderState: order.state,
      orderVersion: order.version,
      resolution: {
        outcome: order.resolution.outcome,
        summary: order.resolution.summary,
        createdAt: order.resolution.createdAt,
      },
      charge: {
        categoryName: order.charge.categoryName,
        offerVersion: order.charge.offerVersion,
        money: { currency: order.charge.currency, amount: order.charge.amount.toFixed(2) },
      },
      payment: {
        status:
          attempt?.state === "APPROVED"
            ? "APROBADO"
            : attempt?.state === "REJECTED"
              ? "RECHAZADO"
              : attempt?.state === "CANCELLED"
                ? "CANCELADO"
                : "PENDIENTE",
        canStartOrResume: !attempt || attempt.state === "REJECTED" || attempt.state === "CANCELLED",
        lastCheckedAt: attempt?.checkedAt ?? null,
        reconciliationAlert: false,
      },
      conformity: order.charge.conformity
        ? {
            textVersion: order.charge.conformity.textVersion,
            acceptedAt: order.charge.conformity.acceptedAt,
            orderState: "CERRADA",
          }
        : null,
    };
  }

  async viewByRequest(actor: AuthenticatedActor, requestId: string) {
    const db: any = this.database;
    const order = await db.workOrder.findUnique({ where: { requestId } });
    if (!order) throw new NotFoundException();
    return this.view(actor, order.id);
  }

  async startCheckout(actor: AuthenticatedActor, requestId: string, expectedOrderVersion: number) {
    if (actor.role !== "CLIENT") throw new NotFoundException();
    const db: any = this.database;
    const order = await db.workOrder.findUnique({
      where: { requestId },
      include: {
        request: true,
        charge: { include: { attempts: { orderBy: { sequence: "desc" } } } },
      },
    });
    if (!order || order.request.clientProfileId !== actor.profileId) throw new NotFoundException();
    if (order.state !== "PENDIENTE_PAGO" || order.version !== expectedOrderVersion || !order.charge)
      throw new ConflictException("PAYMENT_NOT_AVAILABLE");
    const active = order.charge.attempts.find(
      (item: any) =>
        item.state === "CREATED" || item.state === "UNKNOWN" || item.state === "PENDING",
    );
    if (active && active.checkoutUrl)
      return { ...this.checkoutView(active, true), checkoutUrl: active.checkoutUrl };
    if (active?.state === "UNKNOWN")
      throw new ServiceUnavailableException("PREFERENCE_CREATION_UNCERTAIN");
    const attempt =
      active ??
      (await db.paymentAttempt.create({
        data: {
          chargeId: order.charge.id,
          sequence: order.charge.attempts.length + 1,
          externalReference: `pg_${randomUUID().replaceAll("-", "")}`,
        },
      }));
    try {
      const preference = await this.provider.createPreference({
        title: "Servicio PIGAR",
        externalReference: attempt.externalReference,
        currency: "ARS",
        amount: order.charge.amount.toFixed(2),
      });
      if (!preference.checkoutUrl.startsWith("https://"))
        throw new ServiceUnavailableException("CHECKOUT_URL_INVALID");
      await db.paymentAttempt.update({
        where: { id: attempt.id },
        data: { checkoutUrl: preference.checkoutUrl },
      });
      return { ...this.checkoutView(attempt, !!active), checkoutUrl: preference.checkoutUrl };
    } catch {
      await db.paymentAttempt.update({ where: { id: attempt.id }, data: { state: "UNKNOWN" } });
      throw new ServiceUnavailableException("PREFERENCE_CREATION_UNCERTAIN");
    }
  }

  async applyProviderPayment(payment: ProviderPayment) {
    const db: any = this.database;
    const attempt = await db.paymentAttempt.findUnique({
      where: { externalReference: payment.externalReference },
      include: { charge: { include: { workOrder: true } } },
    });
    if (
      !attempt ||
      attempt.charge.currency !== payment.currency ||
      attempt.charge.amount.toFixed(2) !== payment.amount
    )
      throw new ConflictException("PAYMENT_MISMATCH");
    const state = payment.status.toUpperCase();
    if (["APPROVED", "REJECTED", "CANCELLED"].includes(attempt.state)) return attempt.state;
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: { state, providerPaymentIdHash: hash(payment.id), checkedAt: new Date() },
    });
    if (state !== "APPROVED" || attempt.charge.workOrder.state !== "PENDIENTE_PAGO") return state;
    await db.$transaction(async (tx: any) => {
      const current = await tx.workOrder.findUnique({ where: { id: attempt.charge.workOrder.id } });
      if (!current || current.state !== "PENDIENTE_PAGO") return;
      const version = current.version + 1;
      await tx.workOrder.update({
        where: { id: current.id },
        data: {
          state: "PENDIENTE_CONFORMIDAD",
          version,
          transitions: {
            create: {
              action: OrderTransitionAction.CONFIRM_PROVIDER_PAYMENT,
              fromState: "PENDIENTE_PAGO",
              toState: "PENDIENTE_CONFORMIDAD",
              version,
            },
          },
        },
      });
    });
    return state;
  }

  async reconcilePending(limit = 50) {
    const db: any = this.database;
    const attempts = await db.paymentAttempt.findMany({
      where: { state: { in: ["CREATED", "UNKNOWN", "PENDING"] } },
      orderBy: { checkedAt: "asc" },
      take: limit,
    });
    let reconciled = 0;
    for (const attempt of attempts) {
      if (attempt.state === "UNKNOWN") {
        const preference = await this.provider.findPreference(attempt.externalReference);
        if (preference) {
          await db.paymentAttempt.update({
            where: { id: attempt.id },
            data: { state: "CREATED", checkoutUrl: preference.checkoutUrl, checkedAt: new Date() },
          });
        }
      }
      const payments = await this.provider.searchPayments(attempt.externalReference);
      for (const payment of payments) {
        await this.applyProviderPayment(payment);
        reconciled += 1;
      }
      await db.paymentAttempt.update({
        where: { id: attempt.id },
        data: { checkedAt: new Date() },
      });
    }
    return reconciled;
  }

  async reconcileProviderPaymentId(providerPaymentId: string) {
    return this.applyProviderPayment(await this.provider.getPayment(providerPaymentId));
  }

  async conformity(
    actor: AuthenticatedActor,
    requestId: string,
    textVersion: string,
    expectedOrderVersion: number,
  ) {
    if (actor.role !== "CLIENT") throw new NotFoundException();
    const db: any = this.database;
    return db.$transaction(async (tx: any) => {
      const order = await tx.workOrder.findUnique({
        where: { requestId },
        include: { request: true, charge: { include: { conformity: true } } },
      });
      if (!order || order.request.clientProfileId !== actor.profileId)
        throw new NotFoundException();
      if (order.charge?.conformity)
        return {
          orderState: "CERRADA",
          textVersion: order.charge.conformity.textVersion,
          acceptedAt: order.charge.conformity.acceptedAt,
        };
      if (
        order.state !== "PENDIENTE_CONFORMIDAD" ||
        order.version !== expectedOrderVersion ||
        !order.charge
      )
        throw new ConflictException("CONFORMITY_NOT_AVAILABLE");
      const version = order.version + 1;
      const conformity = await tx.conformity.create({
        data: { chargeId: order.charge.id, clientProfileId: actor.profileId, textVersion },
      });
      await tx.workOrder.update({
        where: { id: order.id },
        data: {
          state: "CERRADA",
          version,
          transitions: {
            create: {
              actorProfileId: actor.profileId,
              action: OrderTransitionAction.CONFIRM_CLIENT_CONFORMITY,
              fromState: "PENDIENTE_CONFORMIDAD",
              toState: "CERRADA",
              version,
            },
          },
        },
      });
      return {
        orderState: "CERRADA",
        textVersion: conformity.textVersion,
        acceptedAt: conformity.acceptedAt,
      };
    });
  }

  private checkoutView(attempt: any, reused: boolean) {
    return { attemptId: attempt.id, status: attempt.state, reused, checkoutUrl: undefined };
  }
  private operatorView(order: any) {
    return {
      id: order.id,
      state: order.state,
      version: order.version,
      resolution: order.resolution && {
        outcome: order.resolution.outcome,
        summary: order.resolution.summary,
      },
      charge: order.charge && {
        currency: order.charge.currency,
        amount: order.charge.amount.toFixed(2),
      },
    };
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
function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function isUnique(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
