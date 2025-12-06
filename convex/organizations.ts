// convex/organizations.ts

import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all organizations for a user (via memberships)
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all memberships for the user
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get organization details for each membership
    const orgs = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.orgId as any);
        return org
          ? {
              ...org,
              _id: org._id,
              role: membership.role,
              membershipId: membership._id,
            }
          : null;
      })
    );

    return orgs.filter((org) => org !== null);
  },
});

// Get a single organization by ID
export const get = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orgId as any);
  },
});

// Get all members of an organization
export const getMembers = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    // Get all memberships for this org
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Get user details for each membership
    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("id", membership.userId))
          .first();
        return user
          ? {
              ...user,
              role: membership.role,
              membershipId: membership._id,
              joinedAt: membership.createdAt,
            }
          : null;
      })
    );

    return members.filter((member) => member !== null);
  },
});

// Get organization summary stats
export const getStats = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    // Count projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Count assessments (via projects)
    let totalAssessments = 0;
    for (const project of projects) {
      const assessments = await ctx.db
        .query("assessments")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      totalAssessments += assessments.length;
    }

    // Count members
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const memberCount = memberships.length;

    return {
      projectsCount: projects.length,
      assessmentsCount: totalAssessments,
      membersCount: memberCount,
    };
  },
});

// Get all projects for an organization (for sidebar)
export const getProjects = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

// Get all assessments for an organization (across all projects)
export const getAssessments = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    // Get all projects for this org
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Get all assessments for all projects
    const allAssessments = [];
    for (const project of projects) {
      const assessments = await ctx.db
        .query("assessments")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const assessment of assessments) {
        allAssessments.push({
          ...assessment,
          projectName: project.name,
        });
      }
    }

    return allAssessments.sort((a, b) => b.createdAt - a.createdAt);
  },
});
