// convex/findings.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all findings for an assessment
export const list = query({
  args: {
    assessmentId: v.string(),
    severity: v.optional(v.string()), // filter by severity
    status: v.optional(v.string()), // filter by status
  },
  handler: async (ctx, args) => {
    const severity = args.severity;
    const status = args.status;
    
    if (severity) {
      return await ctx.db
        .query("findings")
        .withIndex("by_assessment_severity", (q) =>
          q.eq("assessmentId", args.assessmentId).eq("severity", severity)
        )
        .order("desc")
        .collect();
    }

    if (status) {
      return await ctx.db
        .query("findings")
        .withIndex("by_assessment_status", (q) =>
          q.eq("assessmentId", args.assessmentId).eq("status", status)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("findings")
      .withIndex("by_assessment", (q) =>
        q.eq("assessmentId", args.assessmentId)
      )
      .order("desc")
      .collect();
  },
});

// Get a single finding by ID
export const get = query({
  args: { findingId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.findingId as any);
  },
});

// Create a new finding
export const create = mutation({
  args: {
    assessmentId: v.string(),
    title: v.string(),
    description: v.string(),
    severity: v.string(), // "critical" | "high" | "medium" | "low" | "info"
    status: v.string(), // "open" | "confirmed" | "false_positive" | "resolved"
    cweId: v.optional(v.string()),
    cvssScore: v.optional(v.number()),
    location: v.optional(v.string()),
    evidence: v.optional(v.string()),
    remediation: v.optional(v.string()),
    createdByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("findings", {
      assessmentId: args.assessmentId,
      title: args.title,
      description: args.description,
      severity: args.severity,
      status: args.status,
      cweId: args.cweId,
      cvssScore: args.cvssScore,
      location: args.location,
      evidence: args.evidence,
      remediation: args.remediation,
      createdByUserId: args.createdByUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a finding
export const update = mutation({
  args: {
    findingId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    severity: v.optional(v.string()),
    status: v.optional(v.string()),
    remediation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { findingId, ...updates } = args;
    const existing = await ctx.db.get(findingId as any);
    if (!existing) {
      throw new Error("Finding not found");
    }

    await ctx.db.patch(findingId as any, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Generate fake findings for testing
export const generateFake = mutation({
  args: {
    assessmentId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fakeFindings = [
      {
        assessmentId: args.assessmentId,
        title: "SQL Injection in User Authentication",
        description:
          "The application is vulnerable to SQL injection attacks in the login endpoint. User input is directly concatenated into SQL queries without proper sanitization.",
        severity: "critical",
        status: "open",
        cweId: "CWE-89",
        cvssScore: 9.8,
        location: "/api/auth/login",
        evidence:
          "POST request to /api/auth/login with payload: username=' OR '1'='1",
        remediation:
          "Use parameterized queries or prepared statements. Implement input validation and sanitization.",
        createdByUserId: args.userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        assessmentId: args.assessmentId,
        title: "Cross-Site Scripting (XSS) in Comments Section",
        description:
          "The comments section does not properly sanitize user input, allowing malicious scripts to be executed in other users' browsers.",
        severity: "high",
        status: "open",
        cweId: "CWE-79",
        cvssScore: 7.2,
        location: "/comments",
        evidence: "Stored XSS payload: <script>alert('XSS')</script>",
        remediation:
          "Implement proper output encoding. Use Content Security Policy (CSP) headers.",
        createdByUserId: args.userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        assessmentId: args.assessmentId,
        title: "Weak Password Policy",
        description:
          "The application allows users to set weak passwords without sufficient complexity requirements.",
        severity: "medium",
        status: "open",
        cweId: "CWE-521",
        cvssScore: 5.3,
        location: "/api/users/register",
        evidence: "Password '123456' was accepted during registration",
        remediation:
          "Enforce strong password policy: minimum 12 characters, mix of uppercase, lowercase, numbers, and special characters.",
        createdByUserId: args.userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        assessmentId: args.assessmentId,
        title: "Missing Security Headers",
        description:
          "The application is missing important security headers such as X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security.",
        severity: "low",
        status: "open",
        cvssScore: 3.1,
        location: "All endpoints",
        evidence: "HTTP response headers analysis",
        remediation:
          "Add security headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security: max-age=31536000",
        createdByUserId: args.userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        assessmentId: args.assessmentId,
        title: "Information Disclosure in Error Messages",
        description:
          "Error messages reveal sensitive information about the application structure and database schema.",
        severity: "info",
        status: "open",
        location: "/api/users/123",
        evidence:
          "Error message: 'Table users does not exist' when accessing invalid user ID",
        remediation:
          "Implement generic error messages for production. Log detailed errors server-side only.",
        createdByUserId: args.userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const ids = [];
    for (const finding of fakeFindings) {
      const id = await ctx.db.insert("findings", finding);
      ids.push(id);
    }

    return ids;
  },
});

/**
 * Get findings for chatbot (across all accessible assessments)
 * Returns findings with project and assessment context
 */
export const getFindingsForChat = query({
  args: {
    userId: v.string(),
    severity: v.optional(v.string()), // "critical" | "high" | "medium" | "low" | "info"
    status: v.optional(v.string()), // "open" | "confirmed" | "false_positive" | "resolved"
    limit: v.optional(v.number()), // Limit number of findings returned (default: 50, max: 100)
    projectId: v.optional(v.string()), // Optional: filter by specific project
    assessmentId: v.optional(v.string()), // Optional: filter by specific assessment
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

    // Step 2: Get all projects (or specific project if projectId provided)
    let projects;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId as any);
      if (!project || !("orgId" in project) || project.orgId !== orgId) {
        return null; // Project not found or user doesn't have access
      }
      projects = [project];
    } else {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
    }

    // Step 3: Get all assessments (or specific assessment if assessmentId provided)
    let allAssessments: any[] = [];
    if (args.assessmentId) {
      const assessment = await ctx.db.get(args.assessmentId as any);
      if (!assessment) {
        return null;
      }
      // Verify assessment belongs to accessible project
      const projectId = ("projectId" in assessment ? assessment.projectId : "") as string;
      const project = await ctx.db.get(projectId as any);
      if (!project || !("orgId" in project) || project.orgId !== orgId) {
        return null;
      }
      allAssessments = [assessment];
    } else {
      for (const project of projects) {
        const assessments = await ctx.db
          .query("assessments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        allAssessments.push(...assessments);
      }
    }

    // Step 4: Get all findings from accessible assessments
    let allFindings: any[] = [];
    for (const assessment of allAssessments) {
      let findingsQuery = ctx.db
        .query("findings")
        .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment._id));

      // Apply severity filter if provided
      if (args.severity) {
        findingsQuery = ctx.db
          .query("findings")
          .withIndex("by_assessment_severity", (q) =>
            q.eq("assessmentId", assessment._id).eq("severity", args.severity!)
          );
      }

      const findings = await findingsQuery.collect();

      // Apply status filter if provided (client-side since we don't have by_assessment_severity_status index)
      let filteredFindings = findings;
      if (args.status) {
        filteredFindings = findings.filter(
          (f) => ("status" in f ? f.status === args.status : false)
        );
      }

      // Enrich findings with project and assessment context
      const projectId = ("projectId" in assessment ? assessment.projectId : "") as string;
      const project = await ctx.db.get(projectId as any);
      const projectName =
        project && "name" in project ? (project.name as string) : "Unknown Project";

      for (const finding of filteredFindings) {
        allFindings.push({
          id: finding._id,
          title: ("title" in finding ? finding.title : "") as string,
          description: ("description" in finding ? finding.description : "") as string,
          severity: ("severity" in finding ? finding.severity : "") as string,
          status: ("status" in finding ? finding.status : "") as string,
          cweId: ("cweId" in finding ? finding.cweId : undefined) as string | undefined,
          cvssScore: ("cvssScore" in finding
            ? finding.cvssScore
            : undefined) as number | undefined,
          location: ("location" in finding ? finding.location : undefined) as string | undefined,
          remediation: ("remediation" in finding
            ? finding.remediation
            : undefined) as string | undefined,
          assessmentId: assessment._id,
          assessmentName: ("name" in assessment ? assessment.name : "") as string,
          projectId: projectId,
          projectName: projectName,
          createdAt: ("createdAt" in finding ? finding.createdAt : 0) as number,
        });
      }
    }

    // Step 5: Sort by severity priority (critical > high > medium > low > info) then by CVSS score
    const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    allFindings.sort((a, b) => {
      const severityDiff =
        (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
        (severityOrder[a.severity as keyof typeof severityOrder] || 0);
      if (severityDiff !== 0) return severityDiff;
      return (b.cvssScore || 0) - (a.cvssScore || 0);
    });

    // Step 6: Apply limit
    const limit = args.limit ? Math.min(args.limit, 100) : 50;
    const limitedFindings = allFindings.slice(0, limit);

    // Step 7: Calculate summary statistics
    const bySeverity = {
      critical: allFindings.filter((f) => f.severity === "critical").length,
      high: allFindings.filter((f) => f.severity === "high").length,
      medium: allFindings.filter((f) => f.severity === "medium").length,
      low: allFindings.filter((f) => f.severity === "low").length,
      info: allFindings.filter((f) => f.severity === "info").length,
    };

    const byStatus = {
      open: allFindings.filter((f) => f.status === "open").length,
      confirmed: allFindings.filter((f) => f.status === "confirmed").length,
      resolved: allFindings.filter((f) => f.status === "resolved").length,
      false_positive: allFindings.filter((f) => f.status === "false_positive").length,
    };

    return {
      findings: limitedFindings,
      summary: {
        total: allFindings.length,
        bySeverity,
        byStatus,
      },
      // Include top CWE IDs
      topCWEIds: Array.from(
        new Set(
          allFindings
            .filter((f) => f.cweId)
            .map((f) => f.cweId)
            .slice(0, 10)
        )
      ) as string[],
    };
  },
});

