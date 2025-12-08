// convex/users.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { encryptToken } from "./utils/encryption";

async function logAuthEvent(
  ctx: any,
  {
    userId,
    provider,
    event,
    scopes,
    details,
  }: { userId: string; provider: string; event: string; scopes?: string[]; details?: string }
) {
  await ctx.db.insert("authEvents", {
    userId,
    provider,
    event,
    scopes,
    details,
    createdAt: Date.now(),
  });
}

// Get user by NextAuth ID
export const getById = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.userId))
      .first();
  },
});

// Get user by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Create or update user (called on login/register)
export const upsert = mutation({
  args: {
    id: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    provider: v.string(),
    githubAccountId: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    githubScopes: v.optional(v.array(v.string())),
    githubAccessToken: v.optional(v.string()),
    githubTokenType: v.optional(v.string()),
    githubTokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.id))
      .first();

    const now = Date.now();

    const scopesChanged =
      args.githubScopes &&
      existing?.githubScopes?.join(" ") !== args.githubScopes.join(" ");

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name || existing.name,
        image: args.image || existing.image,
        provider: args.provider,
        githubAccountId: args.githubAccountId ?? existing.githubAccountId,
        githubUsername: args.githubUsername ?? existing.githubUsername,
        githubScopes: args.githubScopes ?? existing.githubScopes,
        githubAccessToken: args.githubAccessToken
          ? encryptToken(args.githubAccessToken)
          : existing.githubAccessToken,
        githubTokenType: args.githubTokenType ?? existing.githubTokenType,
        githubTokenExpiresAt:
          args.githubTokenExpiresAt ?? existing.githubTokenExpiresAt,
        updatedAt: now,
      });

      if (args.githubAccessToken && !existing.githubAccessToken) {
        await logAuthEvent(ctx, {
          userId: args.id,
          provider: "github",
          event: "connect",
          scopes: args.githubScopes ?? existing.githubScopes ?? [],
          details: "GitHub account connected",
        });
      }

      if (scopesChanged) {
        await logAuthEvent(ctx, {
          userId: args.id,
          provider: "github",
          event: "scope_change",
          scopes: args.githubScopes,
          details: "GitHub scopes updated",
        });
      }
      return existing._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        id: args.id,
        email: args.email,
        name: args.name || "",
        image: args.image || "",
        provider: args.provider,
        githubAccountId: args.githubAccountId,
        githubUsername: args.githubUsername,
        githubScopes: args.githubScopes,
        githubAccessToken: args.githubAccessToken
          ? encryptToken(args.githubAccessToken)
          : undefined,
        githubTokenType: args.githubTokenType,
        githubTokenExpiresAt: args.githubTokenExpiresAt,
        createdAt: now,
        updatedAt: now,
      });

      if (args.githubAccessToken) {
        await logAuthEvent(ctx, {
          userId: args.id,
          provider: "github",
          event: "connect",
          scopes: args.githubScopes ?? [],
          details: "GitHub account connected",
        });
      }
      return userId;
    }
  },
});

// Update user name
export const updateName = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

// Update user theme preference
export const updateTheme = mutation({
  args: {
    userId: v.string(),
    theme: v.string(), // "light" | "dark"
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      theme: args.theme,
      updatedAt: Date.now(),
    });
  },
});

