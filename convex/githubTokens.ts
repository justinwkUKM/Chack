import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { decryptToken } from "./utils/encryption";

async function logAuthEvent(
  ctx: any,
  {
    userId,
    event,
    details,
    scopes,
  }: { userId: string; event: string; details?: string; scopes?: string[] }
) {
  await ctx.db.insert("authEvents", {
    userId,
    provider: "github",
    event,
    scopes,
    details,
    createdAt: Date.now(),
  });
}

export const getToken = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.userId))
      .first();

    if (!user || !user.githubAccessToken) {
      return null;
    }

    return {
      accessToken: decryptToken(user.githubAccessToken),
      tokenType: user.githubTokenType,
      expiresAt: user.githubTokenExpiresAt,
      scopes: user.githubScopes ?? [],
      username: user.githubUsername,
      accountId: user.githubAccountId,
    };
  },
});

export const revokeToken = mutation({
  args: { userId: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    await ctx.db.patch(user._id, {
      githubAccessToken: undefined,
      githubScopes: undefined,
      githubTokenType: undefined,
      githubTokenExpiresAt: undefined,
      updatedAt: now,
    });

    if (user.githubAccessToken) {
      await logAuthEvent(ctx, {
        userId: args.userId,
        event: "disconnect",
        scopes: user.githubScopes ?? [],
        details: args.reason || "GitHub account disconnected",
      });
    }
  },
});
