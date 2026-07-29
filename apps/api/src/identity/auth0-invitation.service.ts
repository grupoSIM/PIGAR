import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { loadApiConfiguration } from "@pigar/config";

type ManagementToken = { access_token?: unknown; expires_in?: unknown; token_type?: unknown };

@Injectable()
export class Auth0InvitationService {
  private readonly configuration = loadApiConfiguration(process.env);
  private token?: { value: string; expiresAt: number };

  async createInvitation(email: string): Promise<void> {
    const auth0 = this.configuration.auth0;
    if (
      !auth0?.adminClientId ||
      !auth0.managementClientId ||
      !auth0.managementClientSecret ||
      !auth0.organizationId
    ) {
      throw new ServiceUnavailableException();
    }

    const response = await fetch(
      `${auth0.issuer}api/v2/organizations/${encodeURIComponent(auth0.organizationId)}/invitations`,
      {
        body: JSON.stringify({ client_id: auth0.adminClientId, invitee: { email } }),
        headers: {
          authorization: `Bearer ${await this.managementToken()}`,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    if (!response.ok) throw new ServiceUnavailableException();
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
    ) {
      throw new ServiceUnavailableException();
    }
    this.token = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(0, payload.expires_in - 30) * 1000,
    };
    return this.token.value;
  }
}
