// convex/users.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.id))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name || existing.name,
        image: args.image || existing.image,
        provider: args.provider,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        id: args.id,
        email: args.email,
        name: args.name || "",
        image: args.image || "",
        provider: args.provider,
        createdAt: now,
        updatedAt: now,
      });
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

