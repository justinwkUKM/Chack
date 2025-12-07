// convex/results.ts

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all results for an assessment
export const list = query({
  args: {
    assessmentId: v.string(),
    type: v.optional(v.string()), // filter by type
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("results")
      .withIndex("by_assessment", (q) =>
        q.eq("assessmentId", args.assessmentId)
      );

    // Note: We'd need an index for type filtering if needed
    const results = await query.order("desc").collect();

    if (args.type) {
      return results.filter((r) => r.type === args.type);
    }

    return results;
  },
});

// Get a single result by ID
export const get = query({
  args: { resultId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.resultId as any);
  },
});

// Create a new result
export const create = mutation({
  args: {
    assessmentId: v.string(),
    type: v.string(), // "scan_data" | "vulnerability" | "configuration" | "log" | "report"
    data: v.string(), // JSON string of the result data
    metadata: v.optional(v.string()), // Additional metadata as JSON
    createdByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("results", {
      assessmentId: args.assessmentId,
      type: args.type,
      data: args.data,
      metadata: args.metadata,
      createdByUserId: args.createdByUserId,
      createdAt: Date.now(),
    });
  },
});

// Save raw report from SSE stream
export const saveReport = mutation({
  args: {
    assessmentId: v.string(),
    report: v.string(), // Raw markdown report
    reportType: v.string(), // "blackbox" | "whitebox"
    createdByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if report already exists for this assessment
    const existingReports = await ctx.db
      .query("results")
      .withIndex("by_assessment", (q) =>
        q.eq("assessmentId", args.assessmentId)
      )
      .filter((q) => q.eq(q.field("type"), "report"))
      .collect();

    // If report exists, update it; otherwise create new
    if (existingReports.length > 0) {
      // Update the most recent report
      const latestReport = existingReports[0];
      await ctx.db.patch(latestReport._id, {
        data: JSON.stringify({ report: args.report, reportType: args.reportType }),
        metadata: JSON.stringify({ format: "markdown", source: "sse_stream", savedAt: Date.now() }),
        createdAt: Date.now(),
      });
      return latestReport._id;
    } else {
      // Create new report
      return await ctx.db.insert("results", {
        assessmentId: args.assessmentId,
        type: "report",
        data: JSON.stringify({ report: args.report, reportType: args.reportType }),
        metadata: JSON.stringify({ format: "markdown", source: "sse_stream", savedAt: Date.now() }),
        createdByUserId: args.createdByUserId,
        createdAt: Date.now(),
      });
    }
  },
});

// Generate fake results for testing
export const generateFake = mutation({
  args: {
    assessmentId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fakeResults = [
      {
        assessmentId: args.assessmentId,
        type: "scan_data",
        data: JSON.stringify({
          scanId: "scan-001",
          startTime: new Date(now - 3600000).toISOString(),
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

    const ids = [];
    for (const result of fakeResults) {
      const id = await ctx.db.insert("results", result);
      ids.push(id);
    }

    return ids;
  },
});

