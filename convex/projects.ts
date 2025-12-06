// convex/projects.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all projects for an organization
export const list = query({
  args: {
    orgId: v.string(),
    status: v.optional(v.string()), // filter by status
  },
  handler: async (ctx, args) => {
    const status = args.status;
    if (status) {
      return await ctx.db
        .query("projects")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", status)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

// Get a single project by ID
export const get = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId as any);
  },
});

// Create a new project
export const create = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("projects", {
      orgId: args.orgId,
      name: args.name,
      description: args.description,
      createdByUserId: args.createdByUserId,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a project
export const update = mutation({
  args: {
    projectId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    const existing = await ctx.db.get(projectId as any);
    if (!existing) {
      throw new Error("Project not found");
    }

    await ctx.db.patch(projectId as any, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a project (soft delete by archiving)
export const archive = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.projectId as any);
    if (!existing) {
      throw new Error("Project not found");
    }

    await ctx.db.patch(args.projectId as any, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

// Hard delete a project and all its assessments
export const deleteProject = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.projectId as any);
    if (!existing) {
      throw new Error("Project not found");
    }

    // Delete all assessments for this project
    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const assessment of assessments) {
      // Delete all findings for each assessment
      const findings = await ctx.db
        .query("findings")
        .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment._id))
        .collect();
      
      for (const finding of findings) {
        await ctx.db.delete(finding._id);
      }

      // Delete all results for each assessment
      const results = await ctx.db
        .query("results")
        .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment._id))
        .collect();
      
      for (const result of results) {
        await ctx.db.delete(result._id);
      }

      // Delete the assessment
      await ctx.db.delete(assessment._id);
    }

    // Delete the project
    await ctx.db.delete(args.projectId as any);
  },
});

