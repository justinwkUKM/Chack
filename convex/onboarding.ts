// convex/onboarding.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createOrganization = mutation({
  args: { name: v.string(), userId: v.string() },
  async handler(ctx, { name, userId }) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const now = Date.now();
    return await ctx.db.insert("organizations", {
      name,
      slug,
      createdByUserId: userId,
      plan: "free",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const joinOrganization = mutation({
  args: { orgId: v.string(), userId: v.string(), role: v.string() },
  async handler(ctx, { orgId, userId, role }) {
    return await ctx.db.insert("memberships", {
      orgId,
      userId,
      role,
      createdAt: Date.now(),
    });
  },
});

