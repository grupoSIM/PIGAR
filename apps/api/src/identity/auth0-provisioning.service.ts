import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { loadApiConfiguration } from "@pigar/config";
import { randomBytes } from "node:crypto";

type ManagementToken = { access_token?: unknown; expires_in?: unknown; token_type?: unknown };
type Auth0User = { user_id?: unknown };

@Injectable()
export class Auth0ProvisioningService {
  private readonly configuration = loadApiConfiguration(process.env);
  private token?: { value: string; expiresAt: number };

  async provisionInternalAccount(email: string): Promise<string> {
    const auth0 = this.configuration.auth0;
    if (!auth0?.internalConnection) throw new ServiceUnavailableException();
    const existing = await this.userByEmail(email);
    if (existing) return existing;

    const response = await this.managementRequest("users", {
      connection: auth0.internalConnection,
      email,
      password: randomBytes(32).toString("base64url"),
    });
    const created = await userId(response);
    if (created) {
      await this.requestPasswordReset(created);
      return created;
    }
    const concurrent = await this.userByEmail(email);
    if (concurrent) return concurrent;
    throw new ServiceUnavailableException();
  }

  async requestPasswordReset(subject: string): Promise<void> {
    const response = await this.managementRequest("tickets/password-change", { user_id: subject });
    if (!response.ok) throw new ServiceUnavailableException();
  }

  private async userByEmail(email: string): Promise<string | undefined> {
    const response = await this.managementRequest(
      `users-by-email?email=${encodeURIComponent(email)}`,
    );
    if (!response.ok) throw new ServiceUnavailableException();
    const users = (await response.json().catch(() => [])) as unknown;
    if (!Array.isArray(users) || users.length === 0) return undefined;
    return userIdFrom(users[0]);
  }

  private async managementRequest(path: string, body?: object): Promise<Response> {
    const auth0 = this.configuration.auth0;
    if (!auth0?.managementClientId || !auth0.managementClientSecret)
      throw new ServiceUnavailableException();
    return fetch(`${auth0.issuer}api/v2/${path}`, {
      ...(body ? { body: JSON.stringify(body), method: "POST" } : { method: "GET" }),
      headers: {
        authorization: `Bearer ${await this.managementToken()}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
    });
  }

  private async managementToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    const auth0 = this.configuration.auth0;
    if (!auth0?.managementClientId || !auth0.managementClientSecret)
      throw new ServiceUnavailableException();
    const response = await fetch(`${auth0.issuer}oauth/token`, {
      body: JSON.stringify({
        audience: `${auth0.issuer}api/v2/`,
        client_id: auth0.managementClientId,
        client_secret: auth0.managementClientSecret,
        grant_type: "client_credentials",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as ManagementToken;
    if (
      !response.ok ||
      payload.token_type !== "Bearer" ||
      typeof payload.access_token !== "string" ||
      typeof payload.expires_in !== "number"
    )
      throw new ServiceUnavailableException();
    this.token = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(0, payload.expires_in - 30) * 1000,
    };
    return this.token.value;
  }
}

async function userId(response: Response): Promise<string | undefined> {
  if (!response.ok) return undefined;
  return userIdFrom((await response.json().catch(() => ({}))) as Auth0User);
}

function userIdFrom(value: unknown): string | undefined {
  const userId = (value as Auth0User | undefined)?.user_id;
  return typeof userId === "string" && userId.length <= 255 ? userId : undefined;
}
