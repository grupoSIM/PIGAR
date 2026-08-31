import { Controller, Get, Headers, Param, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { IdentityGuard } from "../identity/identity.guard.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";
import { NotificationsService } from "./notifications.service.js";

type RequestWithActor = FastifyRequest & { actor: AuthenticatedActor };
@Controller("v1/notifications")
@UseGuards(IdentityGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get()
  list(
    @Req() request: RequestWithActor,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.notifications.list(request.actor, cursor, limit, requestId);
  }
  @Put(":notificationId/read")
  read(
    @Req() request: RequestWithActor,
    @Param("notificationId") notificationId: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.notifications.markRead(request.actor, notificationId, requestId);
  }
}
