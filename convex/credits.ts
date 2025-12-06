// convex/credits.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get credit balance for an organization
export const getBalance = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      throw new Error("Organization not found");
    }
    // Handle backward compatibility: if credits is undefined, return default based on plan
    if (!("credits" in org) || org.credits === undefined) {
      const plan = ("plan" in org ? org.plan : "free") as string;
      return plan === "pro" ? 1000 : 10;
    }
    return (org.credits as number) ?? 0;
  },
});

// Get credit transaction history
export const getHistory = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("creditTransactions")
      .withIndex("by_org_created", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(limit);
  },
});

// Deduct credits (for assessment creation)
export const deduct = mutation({
  args: {
    orgId: v.string(),
    amount: v.number(),
    description: v.string(),
    assessmentId: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Handle backward compatibility
    let currentCredits: number;
    if (!("credits" in org) || org.credits === undefined) {
      const plan = ("plan" in org ? org.plan : "free") as string;
      currentCredits = plan === "pro" ? 1000 : 10;
      // Backfill credits
      await ctx.db.patch(args.orgId as any, {
        credits: currentCredits,
        updatedAt: Date.now(),
      });
    } else {
      currentCredits = (org.credits as number) ?? 0;
    }

    if (currentCredits < args.amount) {
      throw new Error("Insufficient credits");
    }

    const newBalance = currentCredits - args.amount;

    // Update organization credits
    await ctx.db.patch(args.orgId as any, {
      credits: newBalance,
      updatedAt: Date.now(),
    });

    // Create transaction record
    await ctx.db.insert("creditTransactions", {
      orgId: args.orgId,
      type: "deduct",
      amount: -args.amount,
      balanceAfter: newBalance,
      description: args.description,
      assessmentId: args.assessmentId,
      createdByUserId: args.userId,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});

// Add credits (for plan upgrades)
export const add = mutation({
  args: {
    orgId: v.string(),
    amount: v.number(),
    description: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Handle backward compatibility
    let currentCredits: number;
    if (!("credits" in org) || org.credits === undefined) {
      const plan = ("plan" in org ? org.plan : "free") as string;
      currentCredits = plan === "pro" ? 1000 : 10;
    } else {
      currentCredits = (org.credits as number) ?? 0;
    }

    const newBalance = currentCredits + args.amount;

    // Update organization credits
    await ctx.db.patch(args.orgId as any, {
      credits: newBalance,
      updatedAt: Date.now(),
    });

    // Create transaction record
    await ctx.db.insert("creditTransactions", {
      orgId: args.orgId,
      type: "add",
      amount: args.amount,
      balanceAfter: newBalance,
      description: args.description,
      createdByUserId: args.userId,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});

// Check if organization has enough credits
export const hasEnough = query({
  args: {
    orgId: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      return false;
    }
    // Handle backward compatibility
    let currentCredits: number;
    if (!("credits" in org) || org.credits === undefined) {
      const plan = ("plan" in org ? org.plan : "free") as string;
      currentCredits = plan === "pro" ? 1000 : 10;
    } else {
      currentCredits = (org.credits as number) ?? 0;
    }
    return currentCredits >= args.amount;
  },
});

