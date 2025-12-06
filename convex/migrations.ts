// convex/migrations.ts

import { mutation } from "./_generated/server";

// Migration to add credits to existing organizations
// Run this once to backfill credits for organizations created before credits were added
export const backfillCredits = mutation({
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    let updated = 0;

    for (const org of orgs) {
      if (!("credits" in org) || org.credits === undefined) {
        // Set credits based on plan
        const credits = org.plan === "pro" ? 1000 : 10; // Default to free plan credits
        
        await ctx.db.patch(org._id, {
          credits,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { updated, total: orgs.length };
  },
});

