// convex/targets.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all targets for the current org
export const list = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("targets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

// Create a target (for now we trust orgId/userId passed in)
export const create = mutation({
  args: {
    orgId: v.string(),
    createdByUserId: v.string(),
    name: v.string(),
    mode: v.string(), // "blackbox" | "whitebox"
    type: v.string(), // "web_app" | "api"
    primaryIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("targets", {
      orgId: args.orgId,
      createdByUserId: args.createdByUserId,
      name: args.name,
      mode: args.mode,
      type: args.type,
      primaryIdentifier: args.primaryIdentifier,
      verificationStatus: "unverified",
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

