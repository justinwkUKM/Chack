// convex/onboarding.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createOrganization = mutation({
  args: { name: v.string(), userId: v.string() },
  async handler(ctx, { name, userId }) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const now = Date.now();
    
    // All new organizations start with Free plan and 10 credits by default
    const initialCredits = 10;
    
    const orgId = await ctx.db.insert("organizations", {
      name,
      slug,
      createdByUserId: userId,
      plan: "free", // Default plan for all new users
      credits: initialCredits, // Free plan: 10 credits by default
      createdAt: now,
      updatedAt: now,
    });

    // Create initial credit transaction record for audit trail
    await ctx.db.insert("creditTransactions", {
      orgId,
      type: "add",
      amount: initialCredits,
      balanceAfter: initialCredits,
      description: "Initial credits for free plan signup",
      createdByUserId: userId,
      createdAt: now,
    });

    return orgId;
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

