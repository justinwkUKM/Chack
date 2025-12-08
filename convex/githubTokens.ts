// convex/githubTokens.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

// Save token to githubTokens table (for OAuth and installation tokens)
export const saveToken = mutation({
  args: {
    userId: v.string(),
    tokenType: v.string(),
    encryptedToken: v.string(),
    expiresAt: v.optional(v.number()),
    installationId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("githubTokens")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("tokenType", args.tokenType)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedToken: args.encryptedToken,
        expiresAt: args.expiresAt,
        installationId: args.installationId,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("githubTokens", {
      userId: args.userId,
      tokenType: args.tokenType,
      encryptedToken: args.encryptedToken,
      expiresAt: args.expiresAt,
      installationId: args.installationId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get token from githubTokens table
export const getToken = query({
  args: { userId: v.string(), tokenType: v.optional(v.string()) },
  async handler(ctx, args) {
    // If tokenType is provided, get from githubTokens table
    if (args.tokenType) {
      return await ctx.db
        .query("githubTokens")
        .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("tokenType", args.tokenType as string))
        .first();
    }

    // Otherwise, get from users table (for backward compatibility)
    // Note: We return the encrypted token - decryption happens in API routes
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.userId))
      .first();

    if (!user || !user.githubAccessToken) {
      return null;
    }

    // Return token metadata (encrypted token should be decrypted in API routes)
    return {
      encryptedToken: user.githubAccessToken,
      tokenType: user.githubTokenType,
      expiresAt: user.githubTokenExpiresAt,
      scopes: user.githubScopes ?? [],
      username: user.githubUsername,
      accountId: user.githubAccountId,
    };
  },
});

// Delete token from githubTokens table
export const deleteToken = mutation({
  args: { userId: v.string(), tokenType: v.string() },
  async handler(ctx, { userId, tokenType }) {
    const existing = await ctx.db
      .query("githubTokens")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("tokenType", tokenType))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      await logAuthEvent(ctx, {
        userId,
        event: "disconnect",
        details: `GitHub ${tokenType} token deleted`,
      });
    }
  },
});

// Revoke token from users table (for backward compatibility)
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
