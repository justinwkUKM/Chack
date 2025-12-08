// convex/githubTokens.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

export const getToken = query({
  args: { userId: v.string(), tokenType: v.string() },
  async handler(ctx, { userId, tokenType }) {
    return await ctx.db
      .query("githubTokens")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("tokenType", tokenType))
      .first();
  },
});

export const deleteToken = mutation({
  args: { userId: v.string(), tokenType: v.string() },
  async handler(ctx, { userId, tokenType }) {
    const existing = await ctx.db
      .query("githubTokens")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("tokenType", tokenType))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
