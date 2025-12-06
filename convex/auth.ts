// convex/auth.ts

import { query } from "./_generated/server";
import { v } from "convex/values";

export const isOnboarded = query({
  args: { userId: v.string() },
  async handler(ctx, { userId }) {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return Boolean(membership);
  },
});

