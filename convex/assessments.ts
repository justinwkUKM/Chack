// convex/assessments.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all assessments for a project
export const list = query({
  args: {
    projectId: v.string(),
    status: v.optional(v.string()), // filter by status
  },
  handler: async (ctx, args) => {
    const status = args.status;
    if (status) {
      return await ctx.db
        .query("assessments")
        .withIndex("by_project_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", status)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("assessments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

// Get a single assessment by ID
export const get = query({
  args: { assessmentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assessmentId as any);
  },
});

// Create a new assessment and start it immediately
export const create = mutation({
  args: {
    projectId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // "blackbox" | "whitebox"
    targetType: v.string(), // "web_app" | "api" | "mobile" | "network"
    targetUrl: v.optional(v.string()),
    gitRepoUrl: v.optional(v.string()), // For whitebox assessments
    githubRepoIds: v.optional(v.array(v.number())), // Selected GitHub repositories
    createdByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get project to find organization
    const project = await ctx.db.get(args.projectId as any);
    if (!project || !("orgId" in project)) {
      throw new Error("Project not found");
    }

    const orgId = project.orgId as string;

    // Check if organization has enough credits and valid subscription
    const org = await ctx.db.get(orgId as any);
    if (!org) {
      throw new Error("Organization not found");
    }

    const plan = ("plan" in org ? org.plan : "free") as string;
    const stripeStatus = ("stripeStatus" in org ? org.stripeStatus : undefined) as string | undefined;

    // Validate Pro plan subscription
    if (plan === "pro") {
      if (!stripeStatus || (stripeStatus !== "active" && stripeStatus !== "trialing")) {
        throw new Error(
          "Your Pro subscription is not active. Please update your payment method or contact support."
        );
      }
    }

    // Handle backward compatibility
    let orgCredits: number;
    if (!("credits" in org) || org.credits === undefined) {
      orgCredits = plan === "pro" ? 1000 : 10;
      // Backfill credits
      await ctx.db.patch(orgId as any, {
        credits: orgCredits,
        updatedAt: Date.now(),
      });
    } else {
      orgCredits = (org.credits as number) ?? 0;
    }

    if (orgCredits < 1) {
      throw new Error("Insufficient credits. Please upgrade your plan.");
    }

    // Deduct 1 credit before creating assessment
    const newBalance = orgCredits - 1;

    // Update organization credits
    await ctx.db.patch(orgId as any, {
      credits: newBalance,
      updatedAt: Date.now(),
    });

    const now = Date.now();
    const assessmentId = await ctx.db.insert("assessments", {
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      type: args.type,
      targetType: args.targetType,
      targetUrl: args.targetUrl,
      gitRepoUrl: args.gitRepoUrl,
      githubRepoIds: args.githubRepoIds,
      status: "running",
      createdByUserId: args.createdByUserId,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Create credit transaction record
    await ctx.db.insert("creditTransactions", {
      orgId: orgId,
      type: "deduct",
      amount: -1,
      balanceAfter: newBalance,
      description: `Assessment: ${args.name}`,
      assessmentId: assessmentId,
      createdByUserId: args.createdByUserId,
      createdAt: now,
    });

    return assessmentId;
  },
});

// Update assessment status
export const updateStatus = mutation({
  args: {
    assessmentId: v.string(),
    status: v.string(),
    completedAt: v.optional(v.number()),
    sessionId: v.optional(v.string()), // Add sessionId parameter
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId as any);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.completedAt !== undefined) {
      updates.completedAt = args.completedAt;
    }

    if (args.sessionId !== undefined) {
      updates.sessionId = args.sessionId;
    }

    await ctx.db.patch(args.assessmentId as any, updates);
  },
});

// Parse report and create findings/results
export const parseReport = mutation({
  args: {
    assessmentId: v.string(),
    report: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId as any);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const now = Date.now();

    // Save the full report as a result
    await ctx.db.insert("results", {
      assessmentId: args.assessmentId,
      type: "scan_data",
      data: JSON.stringify({ report: args.report }),
      metadata: JSON.stringify({ format: "markdown" }),
      createdByUserId: args.userId,
      createdAt: now,
    });

    // Parse markdown report to extract findings
    // This is a simplified parser - you may want to enhance it
    const reportLines = args.report.split("\n");
    let currentFinding: any = null;
    const findings: any[] = [];

    for (const line of reportLines) {
      // Look for headings that might indicate findings
      if (line.startsWith("#")) {
        if (currentFinding) {
          findings.push(currentFinding);
        }
        currentFinding = {
          title: line.replace(/^#+\s*/, "").trim(),
          description: "",
          severity: "medium",
          status: "open",
          createdByUserId: args.userId,
          createdAt: now,
          updatedAt: now,
        };
      } else if (line.toLowerCase().includes("severity:") || line.toLowerCase().includes("severity -")) {
        const severityMatch = line.match(/severity[:\-]\s*(critical|high|medium|low|info)/i);
        if (severityMatch && currentFinding) {
          currentFinding.severity = severityMatch[1].toLowerCase();
        }
      } else if (line.toLowerCase().includes("cwe")) {
        const cweMatch = line.match(/cwe[-\s]?(\d+)/i);
        if (cweMatch && currentFinding) {
          currentFinding.cweId = `CWE-${cweMatch[1]}`;
        }
      } else if (line.toLowerCase().includes("cvss")) {
        const cvssMatch = line.match(/cvss[:\-]?\s*(\d+\.?\d*)/i);
        if (cvssMatch && currentFinding) {
          currentFinding.cvssScore = parseFloat(cvssMatch[1]);
        }
      } else if (currentFinding && line.trim()) {
        // Accumulate description
        if (currentFinding.description) {
          currentFinding.description += "\n" + line.trim();
        } else {
          currentFinding.description = line.trim();
        }
      }
    }

    // Add the last finding
    if (currentFinding && currentFinding.title) {
      findings.push(currentFinding);
    }

    // Create findings in database
    for (const finding of findings) {
      if (finding.title && finding.description) {
        await ctx.db.insert("findings", {
          assessmentId: args.assessmentId,
          title: finding.title,
          description: finding.description,
          severity: finding.severity || "medium",
          status: finding.status || "open",
          cweId: finding.cweId,
          cvssScore: finding.cvssScore,
          location: finding.location,
          evidence: finding.evidence,
          remediation: finding.remediation,
          createdByUserId: finding.createdByUserId,
          createdAt: finding.createdAt,
          updatedAt: finding.updatedAt,
        });
      }
    }

    return { findingsCount: findings.length };
  },
});

// Run the assessment scan (simulates 5 seconds, then generates findings/results)
export const runScan = mutation({
  args: {
    assessmentId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId as any);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    // Type check - ensure it's an assessment
    if (!("status" in assessment) || assessment.status !== "running") {
      throw new Error("Assessment is not in running state");
    }

    // Simulate scan delay (5 seconds)
    // In a real implementation, this would be an action or scheduled function
    // For now, we'll generate findings/results immediately
    // The client will handle showing loading state for 5 seconds

    const now = Date.now();

    // Generate findings
    const findingsData = [
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

    // Insert findings
    for (const finding of findingsData) {
      await ctx.db.insert("findings", finding);
    }

    // Generate results
    const resultsData = [
      {
        assessmentId: args.assessmentId,
        type: "scan_data",
        data: JSON.stringify({
          scanId: `scan-${args.assessmentId.slice(0, 8)}`,
          startTime: new Date(
            ("startedAt" in assessment ? assessment.startedAt : undefined) || now
          ).toISOString(),
          endTime: new Date(now).toISOString(),
          totalRequests: 15420,
          vulnerabilitiesFound: 5,
          endpointsScanned: 342,
          status: "completed",
        }),
        metadata: JSON.stringify({ tool: "OWASP ZAP", version: "2.12.0" }),
        createdByUserId: args.userId,
        createdAt: now,
      },
      {
        assessmentId: args.assessmentId,
        type: "vulnerability",
        data: JSON.stringify({
          id: "vuln-001",
          name: "SQL Injection",
          severity: "critical",
          affectedEndpoints: ["/api/auth/login", "/api/users/search"],
          description: "SQL injection vulnerability detected",
        }),
        createdByUserId: args.userId,
        createdAt: now - 1800000,
      },
      {
        assessmentId: args.assessmentId,
        type: "configuration",
        data: JSON.stringify({
          securityHeaders: {
            "X-Frame-Options": "missing",
            "X-Content-Type-Options": "missing",
            "Strict-Transport-Security": "missing",
            "Content-Security-Policy": "missing",
          },
          sslConfiguration: {
            tlsVersion: "TLS 1.2",
            cipherSuites: ["TLS_RSA_WITH_AES_256_CBC_SHA"],
            certificateValid: true,
          },
        }),
        createdByUserId: args.userId,
        createdAt: now - 1200000,
      },
      {
        assessmentId: args.assessmentId,
        type: "log",
        data: JSON.stringify({
          timestamp: new Date(now - 900000).toISOString(),
          level: "WARNING",
          message: "Suspicious activity detected",
          details: {
            ip: "192.168.1.100",
            userAgent: "Mozilla/5.0",
            endpoint: "/api/admin/users",
            statusCode: 403,
          },
        }),
        createdByUserId: args.userId,
        createdAt: now - 900000,
      },
    ];

    // Insert results
    for (const result of resultsData) {
      await ctx.db.insert("results", result);
    }

    // Update assessment status to completed
    await ctx.db.patch(args.assessmentId as any, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Update assessment details
export const update = mutation({
  args: {
    assessmentId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { assessmentId, ...updates } = args;
    const existing = await ctx.db.get(assessmentId as any);
    if (!existing) {
      throw new Error("Assessment not found");
    }

    await ctx.db.patch(assessmentId as any, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete an assessment and all its related data
export const deleteAssessment = mutation({
  args: { assessmentId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.assessmentId as any);
    if (!existing) {
      throw new Error("Assessment not found");
    }

    // Delete all findings for this assessment
    const findings = await ctx.db
      .query("findings")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();
    
    for (const finding of findings) {
      await ctx.db.delete(finding._id);
    }

    // Delete all results for this assessment
    const results = await ctx.db
      .query("results")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();
    
    for (const result of results) {
      await ctx.db.delete(result._id);
    }

    // Delete the assessment
    await ctx.db.delete(args.assessmentId as any);
  },
});

