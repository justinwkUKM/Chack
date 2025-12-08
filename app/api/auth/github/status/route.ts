import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { decryptToken } from "@/lib/githubAuth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ connected: false });
  }

  // Only allow GitHub users to use this feature
  if (session.user.provider !== "github") {
    return NextResponse.json({ 
      connected: false,
      error: "GitHub connection is only available for users who signed in with GitHub."
    });
  }

  try {
    // Check if user has a stored GitHub token
    const tokenData = await fetchQuery(api.githubTokens.getToken, {
      userId: session.user.id,
      tokenType: "oauth",
    });

    if (!tokenData) {
      return NextResponse.json({ connected: false });
    }

    // Check if token is expired
    if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
      return NextResponse.json({ 
        connected: false,
        expired: true 
      });
    }

    // Decrypt token to get user info
    let tokenInfo: any = null;
    try {
      tokenInfo = decryptToken(tokenData.encryptedToken);
    } catch (error) {
      console.error("Failed to decrypt token:", error);
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      username: session.user.name || session.user.email || "GitHub user",
      avatar: session.user.image,
    });
  } catch (error) {
    console.error("Failed to check GitHub token status:", error);
    return NextResponse.json({ connected: false });
  }
}
