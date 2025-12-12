// convex/organizations.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all organizations for a user (via memberships)
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all memberships for the user
    const
     memberships = await ctx.db
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

// Get membership for a user (returns first membership)
export const getMembershipByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    return membership ? { orgId: membership.orgId, role: membership.role } : null;
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

/**
 * Get organization info for chatbot (name, credits, plan, slug)
 * Returns only the data needed for the AI assistant
 */
export const getOrgInfoForChat = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!membership) {
      return null;
    }

    const org = await ctx.db.get(membership.orgId as any);
    if (!org) {
      return null;
    }

    // Type-safe property access
    const orgName = "name" in org ? (org.name as string) : "";
    const orgSlug = "slug" in org ? (org.slug as string) : "";
    const orgPlan = "plan" in org ? (org.plan as string) : "free";
    const orgCredits = "credits" in org ? ((org.credits as number | undefined) ?? 0) : 0;

    // Return only the fields needed for the chatbot
    return {
      name: orgName,
      slug: orgSlug,
      plan: orgPlan,
      credits: orgCredits,
      role: membership.role,
    };
  },
});

// Update organization name
export const updateName = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    const slug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await ctx.db.patch(args.orgId as any, {
      name: args.name,
      slug,
      updatedAt: Date.now(),
    });
  },
});

// Update organization plan
export const updatePlan = mutation({
  args: {
    orgId: v.string(),
    plan: v.string(), // "free" | "pro" | "enterprise"
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId as any);
    if (!org || !("plan" in org) || !("credits" in org)) {
      throw new Error("Organization not found");
    }

    const oldPlan = org.plan as string;
    const currentCredits = (org.credits as number) ?? 0;

    // Calculate new credits based on plan
    let newCredits = currentCredits; // Credits carry over
    let creditsToAdd = 0;

    if (args.plan === "pro" && oldPlan === "free") {
      // Upgrade: add 1000 credits (carry over existing)
      creditsToAdd = 1000;
      newCredits = currentCredits + 1000;
    } else if (args.plan === "free" && oldPlan === "pro") {
      // Downgrade: keep existing credits
      newCredits = currentCredits;
    } else if (args.plan === "enterprise") {
      // Enterprise: keep existing credits, no limit
      newCredits = currentCredits;
    }

    // Update organization
    await ctx.db.patch(args.orgId as any, {
      plan: args.plan,
      credits: newCredits,
      updatedAt: Date.now(),
    });

    // Create transaction record
    if (creditsToAdd > 0) {
      await ctx.db.insert("creditTransactions", {
        orgId: args.orgId,
        type: "plan_upgrade",
        amount: creditsToAdd,
        balanceAfter: newCredits,
        description: `Plan upgrade: ${oldPlan} → ${args.plan}`,
        createdByUserId: args.userId,
        createdAt: Date.now(),
      });
    } else if (args.plan !== oldPlan) {
      await ctx.db.insert("creditTransactions", {
        orgId: args.orgId,
        type: args.plan === "enterprise" ? "plan_upgrade" : "plan_downgrade",
        amount: 0,
        balanceAfter: newCredits,
        description: `Plan change: ${oldPlan} → ${args.plan}`,
        createdByUserId: args.userId,
        createdAt: Date.now(),
      });
    }

    return { credits: newCredits };
  },
});
