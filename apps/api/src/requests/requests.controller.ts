import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { IdentityGuard } from "../identity/identity.guard.js";
import type { AuthenticatedActor } from "../identity/identity.types.js";
import { mediaException, RequestMediaService } from "./request-media.service.js";
import { AddressNormalizerService } from "./address-normalizer.service.js";
import { RequestsService, type CreateRequestInput } from "./requests.service.js";

type RequestWithActor = FastifyRequest & { actor: AuthenticatedActor };
@Controller("v1")
@UseGuards(IdentityGuard)
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly media: RequestMediaService,
    private readonly normalizer: AddressNormalizerService,
  ) {}
  @Post("requests/address/resolve") async resolveAddress(
    @Req() request: RequestWithActor,
    @Body() body: unknown,
  ) {
    if (request.actor.role !== "CLIENT") throw new ForbiddenException();
    const coordinates = resolveCoordinates(body);
    return {
      address: (await this.normalizer.reverse(coordinates.latitude, coordinates.longitude)) ?? null,
    };
  }
  @Post("requests") async create(
    @Req() request: RequestWithActor,
    @Headers("idempotency-key") key: string | undefined,
    @Headers("x-request-id") correlation: string | undefined,
    @Body() body: unknown,
  ) {
    if (request.actor.role !== "CLIENT" || !key || key.length > 160) throw new ConflictException();
    return this.requests.create(request.actor, key, requestInput(body), correlation);
  }
  @Get("requests") listOwn(@Req() request: RequestWithActor) {
    if (request.actor.role !== "CLIENT") throw new NotFoundException();
    return this.requests.listOwn(request.actor);
  }
  @Get("requests/:id") get(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Headers("x-request-id") correlation?: string,
  ) {
    return this.requests.get(request.actor, id, correlation);
  }
  @Get("admin/requests") list(
    @Req() request: RequestWithActor,
    @Headers("x-request-id") correlation?: string,
  ) {
    return this.requests.listOperational(request.actor, correlation);
  }
  @Post("requests/:id/media") async upload(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
  ) {
    const item = await this.requests.get(request.actor, id);
    if (request.actor.role !== "CLIENT" || !item) throw new NotFoundException();
    try {
      const uploaded = await this.media.upload(id, request.raw);
      await this.requests.auditUpload(
        request.actor,
        id,
        request.headers["x-request-id"] as string | undefined,
      );
      return uploaded;
    } catch (error) {
      throw mediaException(error);
    }
  }
  @Get("requests/:id/media/:mediaId") @HttpCode(200) async download(
    @Req() request: RequestWithActor,
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
    @Headers("x-request-id") correlation: string | undefined,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const media = await this.requests.media(request.actor, id, mediaId, correlation);
    response.header("content-type", media.detectedMime);
    response.header("content-disposition", "inline");
    response.header("x-accel-redirect", this.media.internalPath(media.physicalName));
  }
}

function resolveCoordinates(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ConflictException();
  const source = body as Record<string, unknown>;
  if (Object.keys(source).some((key) => key !== "latitude" && key !== "longitude"))
    throw new ConflictException();
  return {
    latitude: coordinate(source.latitude, -90, 90),
    longitude: coordinate(source.longitude, -180, 180),
  };
}

function requestInput(body: unknown): CreateRequestInput {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw rejected("REQUEST_BODY_INVALID");
  const source = body as Record<string, unknown>;
  const allowed = ["offerId", "description", "address"];
  if (Object.keys(source).some((key) => !allowed.includes(key)))
    throw rejected("REQUEST_FIELD_INVALID");
  const text = (value: unknown, max: number, required = true) => {
    if (value === undefined || value === null) {
      if (!required) return undefined;
      throw rejected("REQUEST_TEXT_INVALID");
    }
    if (typeof value !== "string" || (required && !value.trim()) || value.trim().length > max)
      throw rejected("REQUEST_TEXT_INVALID");
    return value.trim() || undefined;
  };
  if (!source.address || typeof source.address !== "object" || Array.isArray(source.address))
    throw rejected("REQUEST_ADDRESS_INVALID");
  const address = source.address as Record<string, unknown>;
  const addressKeys = [
    "street",
    "number",
    "neighborhood",
    "crossStreetOne",
    "crossStreetTwo",
    "normalizedAddress",
    "latitude",
    "longitude",
  ];
  if (Object.keys(address).some((key) => !addressKeys.includes(key)))
    throw rejected("REQUEST_ADDRESS_FIELD_INVALID");
  const latitude =
    address.latitude === undefined ? undefined : coordinate(address.latitude, -90, 90);
  const longitude =
    address.longitude === undefined ? undefined : coordinate(address.longitude, -180, 180);
  if ((latitude === undefined) !== (longitude === undefined))
    throw rejected("REQUEST_COORDINATES_INCOMPLETE");
  const optionalText = (value: unknown, max: number) => {
    const parsed = text(value, max, false);
    return parsed === undefined ? {} : { value: parsed };
  };
  const neighborhood = optionalText(address.neighborhood, 120);
  const crossStreetOne = optionalText(address.crossStreetOne, 160);
  const crossStreetTwo = optionalText(address.crossStreetTwo, 160);
  const normalizedAddress = optionalText(address.normalizedAddress, 500);
  return {
    offerId: uuid(source.offerId),
    description: text(source.description, 2000)!,
    address: {
      street: text(address.street, 160)!,
      number: text(address.number, 32)!,
      ...(address.neighborhood !== undefined && "value" in neighborhood
        ? { neighborhood: neighborhood.value }
        : {}),
      ...(address.crossStreetOne !== undefined && "value" in crossStreetOne
        ? { crossStreetOne: crossStreetOne.value }
        : {}),
      ...(address.crossStreetTwo !== undefined && "value" in crossStreetTwo
        ? { crossStreetTwo: crossStreetTwo.value }
        : {}),
      ...(address.normalizedAddress !== undefined && "value" in normalizedAddress
        ? { normalizedAddress: normalizedAddress.value }
        : {}),
      ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {}),
    },
  };
}
function uuid(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
    throw rejected("REQUEST_OFFER_ID_INVALID");
  return value;
}
function coordinate(value: unknown, min: number, max: number) {
  if (
    typeof value !== "string" ||
    !/^-?\d{1,3}(?:\.\d{1,6})?$/.test(value) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw rejected("REQUEST_COORDINATE_INVALID");
  return value;
}

function rejected(code: string) {
  return new ConflictException({ code, message: code });
}
