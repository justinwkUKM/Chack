// convex/scanLogs.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all scan logs for an assessment
export const list = query({
  args: { assessmentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scanLogs")
      .withIndex("by_assessment_timestamp", (q) => 
        q.eq("assessmentId", args.assessmentId)
      )
      .order("asc")
      .collect();
  },
});

// Add a scan log entry
export const addLog = mutation({
  args: {
    assessmentId: v.string(),
    timestamp: v.number(),
    author: v.string(),
    text: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scanLogs", {
      assessmentId: args.assessmentId,
      timestamp: args.timestamp,
      author: args.author,
      text: args.text,
      type: args.type,
      createdAt: Date.now(),
    });
  },
});

// Add multiple scan log entries (batch)
export const addLogsBatch = mutation({
  args: {
    logs: v.array(v.object({
      assessmentId: v.string(),
      timestamp: v.number(),
      author: v.string(),
      text: v.string(),
      type: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertPromises = args.logs.map(log => 
      ctx.db.insert("scanLogs", {
        ...log,
        createdAt: now,
      })
    );
    return await Promise.all(insertPromises);
  },
});

// Clear all logs for an assessment
export const clearLogs = mutation({
  args: { assessmentId: v.string() },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("scanLogs")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();
    
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    
    return { deleted: logs.length };
  },
});

