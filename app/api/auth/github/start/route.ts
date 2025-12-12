// app/api/auth/github/start/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { buildGitHubAuthorizeUrl } from "@/lib/githubAuth";
import { authOptions } from "@/lib/auth";

function createStateCookie(state: string, returnTo: string, reauthReason?: string) {
  return JSON.stringify({ state, returnTo, reauthReason });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/settings";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const destination = new URL("/auth/login", process.env.NEXTAUTH_URL || "http://localhost:3000");
    destination.searchParams.set("callbackUrl", returnTo);
    return NextResponse.redirect(destination.toString());
  }

  let reauthReason: string | undefined;
  try {
    const existingToken = await fetchQuery(api.githubTokens.getToken, {
      userId: session.user.id,
      tokenType: "oauth",
    });

    if (existingToken?.expiresAt && existingToken.expiresAt < Date.now()) {
      reauthReason = "Your GitHub token expired; please re-authorize.";
    }
  } catch (error) {
    console.error("Failed to look up existing GitHub token", error);
  }

  const state = randomBytes(16).toString("hex");
  const redirectUrl = buildGitHubAuthorizeUrl(state);

  const response = NextResponse.redirect(redirectUrl);
  // Secure cookie settings
  response.cookies.set(
    "github_oauth_state",
    createStateCookie(state, returnTo, reauthReason),
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth/github",
      maxAge: 10 * 60, // 10 minutes
    }
  );

  return response;
}
