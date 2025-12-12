// app/api/auth/github/callback/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  encryptToken,
  exchangeCodeForToken,
  getOAuthExpiration,
  getReturnPathFromState,
  refreshInstallationToken,
} from "@/lib/githubAuth";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

function redirectWithError(message: string, returnTo?: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let destination: URL;
  
  if (returnTo && returnTo.startsWith("http")) {
    destination = new URL(returnTo);
  } else if (returnTo && returnTo.startsWith("/")) {
    destination = new URL(returnTo, baseUrl);
  } else {
    destination = new URL(returnTo || "/settings", baseUrl);
  }
  
  destination.searchParams.set("githubAuthError", message);
  return NextResponse.redirect(destination.toString());
}

function redirectWithSuccess(returnTo?: string, status: "connected" | "reauthorized" = "connected", message?: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let destination: URL;
  
  if (returnTo && returnTo.startsWith("http")) {
    destination = new URL(returnTo);
  } else if (returnTo && returnTo.startsWith("/")) {
    destination = new URL(returnTo, baseUrl);
  } else {
    destination = new URL(returnTo || "/settings", baseUrl);
  }
  
  destination.searchParams.set("githubAuthStatus", status);
  if (message) {
    destination.searchParams.set("githubAuthMessage", message);
  }
  return NextResponse.redirect(destination.toString());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirectWithError(error);
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("github_oauth_state");
  const { state: savedState, returnTo, reauthReason } = getReturnPathFromState(stateCookie?.value ?? null);

  if (!state || !savedState || state !== savedState) {
    return redirectWithError("GitHub authentication state is invalid.", returnTo);
  }

  if (!code) {
    return redirectWithError("Missing GitHub authorization code.", returnTo);
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return redirectWithError("You must be signed in to link GitHub.", returnTo);
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const expiresAt = getOAuthExpiration(tokenResponse.expires_in);

    await fetchMutation(api.githubTokens.saveToken, {
      userId: session.user.id,
      tokenType: "oauth",
      encryptedToken: encryptToken({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        scope: tokenResponse.scope,
        tokenType: tokenResponse.token_type,
        expiresAt,
      }),
      expiresAt,
    });

    try {
      const installation = await refreshInstallationToken();
      if (installation) {
        await fetchMutation(api.githubTokens.saveToken, {
          userId: session.user.id,
          tokenType: "installation",
          encryptedToken: encryptToken({
            accessToken: installation.token,
            expiresAt: installation.expiresAt,
            installationId: installation.installationId,
          }),
          expiresAt: installation.expiresAt,
          installationId: installation.installationId,
        });
      }
    } catch (appError) {
      console.error("Failed to refresh GitHub App installation token", appError);
      return redirectWithError("GitHub App installation token refresh failed.", returnTo);
    }

    cookieStore.delete("github_oauth_state");
    return redirectWithSuccess(returnTo, reauthReason ? "reauthorized" : "connected", reauthReason);
  } catch (callbackError: unknown) {
    // Log error without exposing sensitive details
    if (process.env.NODE_ENV === "development") {
      console.error("[GitHub Callback] Error:", callbackError instanceof Error ? callbackError.message : "Unknown error");
    }
    // Generic error message to prevent information disclosure
    return redirectWithError("GitHub authorization failed. Please try again.", returnTo);
  }
}
