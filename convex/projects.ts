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

/**
 * Get projects for chatbot (with assessment counts and metadata)
 * Returns projects with enriched data for the AI assistant
 */
export const getProjectsForChat = query({
  args: {
    userId: v.string(),
    status: v.optional(v.string()), // "active" | "archived"
  },
  handler: async (ctx, args) => {
    // Step 1: Get user's membership to find organization
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!membership) {
      return null; // User not part of any organization
    }

    const orgId = membership.orgId;

    // Step 2: Get projects for the organization
    let projects;
    if (args.status) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .order("desc")
        .collect();
    }

    // Step 3: Enrich with assessment counts and recent activity
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        // Get assessment counts by status
        const allAssessments = await ctx.db
          .query("assessments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const assessmentsByStatus = {
          total: allAssessments.length,
          running: allAssessments.filter((a) =>
            "status" in a ? a.status === "running" : false
          ).length,
          completed: allAssessments.filter((a) =>
            "status" in a ? a.status === "completed" : false
          ).length,
          failed: allAssessments.filter((a) =>
            "status" in a ? a.status === "failed" : false
          ).length,
          pending: allAssessments.filter((a) =>
            "status" in a ? a.status === "pending" : false
          ).length,
        };

        // Get most recent assessment
        const recentAssessment = allAssessments
          .sort((a, b) => {
            const aTime = ("createdAt" in a ? a.createdAt : 0) as number;
            const bTime = ("createdAt" in b ? b.createdAt : 0) as number;
            return bTime - aTime;
          })[0];

        return {
          id: project._id,
          name: project.name,
          description: ("description" in project ? project.description : undefined) || "",
          status: ("status" in project ? project.status : "active") as string,
          createdAt: ("createdAt" in project ? project.createdAt : 0) as number,
          updatedAt: ("updatedAt" in project ? project.updatedAt : 0) as number,
          assessments: assessmentsByStatus,
          lastAssessmentAt: recentAssessment
            ? (("createdAt" in recentAssessment
                ? recentAssessment.createdAt
                : 0) as number)
            : null,
        };
      })
    );

    return {
      projects: enrichedProjects,
      total: enrichedProjects.length,
      byStatus: {
        active: enrichedProjects.filter((p) => p.status === "active").length,
        archived: enrichedProjects.filter((p) => p.status === "archived").length,
      },
    };
  },
});

