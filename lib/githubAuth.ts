// lib/githubAuth.ts

import crypto from "crypto";

interface GitHubOAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
}

interface InstallationTokenResponse {
  token: string;
  expires_at: string;
}

const OAUTH_SCOPES = ["repo", "read:user"];

function getAppBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getGitHubCallbackUrl() {
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");
  return `${baseUrl}/api/auth/github/callback`;
}

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(payload: Record<string, unknown>): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const serialized = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken<T = unknown>(encryptedToken: string): T {
  const raw = Buffer.from(encryptedToken, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}

export function buildGitHubAuthorizeUrl(state: string) {
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", process.env.GITHUB_ID || "");
  authorizeUrl.searchParams.set("redirect_uri", getGitHubCallbackUrl());
  authorizeUrl.searchParams.set("scope", OAUTH_SCOPES.join(" "));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("allow_signup", "true");
  return authorizeUrl.toString();
}

export async function exchangeCodeForToken(code: string): Promise<GitHubOAuthTokenResponse> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_ID,
      client_secret: process.env.GITHUB_SECRET,
      code,
      redirect_uri: getGitHubCallbackUrl(),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub token exchange failed: ${response.status} ${errorBody}`);
  }

  const json = (await response.json()) as GitHubOAuthTokenResponse & { error?: string; error_description?: string };
  if (json.error) {
    throw new Error(json.error_description || json.error);
  }

  if (!json.access_token) {
    throw new Error("GitHub token exchange did not return an access token");
  }

  return json;
}

function getGitHubAppCredentials() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;

  if (!appId || !privateKey || !installationId) {
    return null;
  }

  return { appId, privateKey, installationId };
}

function createGitHubAppJwt(appId: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
    "utf8"
  );

  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId }),
    "utf8"
  );

  const encodedHeader = header
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const encodedPayload = payload
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(privateKey);

  const encodedSignature = signature
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${encodedSignature}`;
}

export async function refreshInstallationToken(): Promise<
  | { token: string; expiresAt: number; installationId: string }
  | null
> {
  const credentials = getGitHubAppCredentials();
  if (!credentials) {
    return null;
  }

  const jwtToken = createGitHubAppJwt(credentials.appId, credentials.privateKey);
  const response = await fetch(
    `https://api.github.com/app/installations/${credentials.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwtToken}`,
        "User-Agent": "Chack-App",
      },
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to refresh installation token: ${message}`);
  }

  const payload = (await response.json()) as InstallationTokenResponse;
  return {
    token: payload.token,
    expiresAt: new Date(payload.expires_at).getTime(),
    installationId: credentials.installationId,
  };
}

export function getOAuthExpiration(expiresIn?: number) {
  if (!expiresIn) return undefined;
  return Date.now() + expiresIn * 1000;
}

export function getReturnPathFromState(
  statePayload: string | null
): { state?: string; returnTo?: string; reauthReason?: string } {
  if (!statePayload) return {};
  try {
    const parsed = JSON.parse(statePayload) as {
      state: string;
      returnTo?: string;
      reauthReason?: string;
    };
    return parsed;
  } catch {
    return {};
  }
}
