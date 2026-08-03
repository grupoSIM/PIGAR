import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { loadApiConfiguration } from "@pigar/config";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest } from "fastify";
import { DatabaseService } from "../database.service.js";
import type { AuthenticatedActor } from "./identity.types.js";

type RequestWithActor = FastifyRequest & { actor?: AuthenticatedActor };

@Injectable()
export class IdentityGuard implements CanActivate {
  private readonly configuration = loadApiConfiguration(process.env);
  private readonly jwks = this.configuration.auth0
    ? createRemoteJWKSet(new URL(`${this.configuration.auth0.issuer}.well-known/jwks.json`))
    : undefined;

  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithActor>();
    const token = bearerToken(request.headers.authorization);
    if (!token || !this.configuration.auth0 || !this.jwks) throw new UnauthorizedException();

    try {
      const verified = await jwtVerify(token, this.jwks, {
        algorithms: ["RS256"],
        audience: this.configuration.auth0.audience,
        issuer: this.configuration.auth0.issuer,
      });
      if (!verified.payload.sub) throw new UnauthorizedException();
      const profile = await this.resolveProfile(verified.payload.sub, verified.payload.azp);
      if (!profile || profile.status !== "ACTIVE" || !isPigarRole(profile.role))
        throw new ForbiddenException();
      request.actor = {
        profileId: profile.id,
        role: profile.role,
        subject: profile.identitySubject,
      };
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException)
        throw error;
      throw new UnauthorizedException();
    }
  }

  private async resolveProfile(subject: string, authorizedParty: unknown) {
    const existing = await this.database.profile.findUnique({
      where: { identitySubject: subject },
    });
    if (existing) return existing;
    if (
      this.configuration.auth0?.adminClientId &&
      authorizedParty === this.configuration.auth0.adminClientId
    )
      throw new ForbiddenException();
    try {
      return await this.database.profile.create({
        data: { identitySubject: subject, role: "CLIENT" },
      });
    } catch {
      const concurrent = await this.database.profile.findUnique({
        where: { identitySubject: subject },
      });
      if (concurrent) return concurrent;
      throw new UnauthorizedException();
    }
  }
}

function bearerToken(value: string | undefined): string | undefined {
  const match = value?.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  return match?.[1];
}

function isPigarRole(value: unknown): value is AuthenticatedActor["role"] {
  return value === "CLIENT" || value === "DISPATCHER" || value === "ADMIN";
}
