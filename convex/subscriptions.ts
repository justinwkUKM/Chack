// convex/subscriptions.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get subscription details for an organization
export const getSubscription = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      plan: ("plan" in org ? (org.plan as string) : "free") || "free",
      stripeCustomerId: ("stripeCustomerId" in org ? (org.stripeCustomerId as string | undefined) : undefined),
      stripeSubscriptionId: ("stripeSubscriptionId" in org ? (org.stripeSubscriptionId as string | undefined) : undefined),
      stripePriceId: ("stripePriceId" in org ? (org.stripePriceId as string | undefined) : undefined),
      stripeStatus: ("stripeStatus" in org ? (org.stripeStatus as string | undefined) : undefined),
      stripeCurrentPeriodEnd: ("stripeCurrentPeriodEnd" in org ? (org.stripeCurrentPeriodEnd as number | undefined) : undefined),
      credits: ("credits" in org ? (org.credits as number | undefined) : undefined) ?? 0,
    };
  },
});

// Check if organization has active Pro subscription
export const hasActiveProSubscription = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      return false;
    }

    const plan = ("plan" in org ? (org.plan as string) : "free") || "free";
    const stripeStatus = ("stripeStatus" in org ? (org.stripeStatus as string | undefined) : undefined);

    // Pro plan requires active Stripe subscription
    if (plan === "pro") {
      return stripeStatus === "active" || stripeStatus === "trialing";
    }

    // Enterprise plan doesn't require Stripe (custom billing)
    if (plan === "enterprise") {
      return true;
    }

    return false;
  },
});

// Update subscription from Stripe webhook
export const updateFromStripe = mutation({
  args: {
    orgId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeStatus: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.stripeCustomerId !== undefined) {
      updates.stripeCustomerId = args.stripeCustomerId;
    }
    if (args.stripeSubscriptionId !== undefined) {
      updates.stripeSubscriptionId = args.stripeSubscriptionId;
    }
    if (args.stripePriceId !== undefined) {
      updates.stripePriceId = args.stripePriceId;
    }
    if (args.stripeStatus !== undefined) {
      updates.stripeStatus = args.stripeStatus;
    }
    if (args.stripeCurrentPeriodEnd !== undefined) {
      updates.stripeCurrentPeriodEnd = args.stripeCurrentPeriodEnd;
    }
    if (args.plan !== undefined) {
      updates.plan = args.plan;
    }

    await ctx.db.patch(args.orgId as any, updates);
  },
});

// Create subscription event log
export const logSubscriptionEvent = mutation({
  args: {
    orgId: v.string(),
    event: v.string(),
    stripeEventId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("subscriptionEvents", {
      orgId: args.orgId,
      event: args.event,
      stripeEventId: args.stripeEventId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      details: args.details,
      createdAt: Date.now(),
    });
  },
});

// Get subscription event history
export const getSubscriptionEvents = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(limit);
  },
});

// Cancel subscription (set status to canceled)
export const cancelSubscription = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Update plan to free and clear Stripe subscription
    await ctx.db.patch(args.orgId as any, {
      plan: "free",
      stripeStatus: "canceled",
      updatedAt: Date.now(),
    });

    // Log the cancellation
    await ctx.db.insert("subscriptionEvents", {
      orgId: args.orgId,
      event: "subscription_canceled",
      stripeSubscriptionId: ("stripeSubscriptionId" in org ? (org.stripeSubscriptionId as string | undefined) : undefined),
      stripeCustomerId: ("stripeCustomerId" in org ? (org.stripeCustomerId as string | undefined) : undefined),
      details: JSON.stringify({ canceledBy: args.userId }),
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

