// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - synced from NextAuth
  users: defineTable({
    id: v.string(), // NextAuth user id (sub)
    email: v.string(),
    name: v.string(),
    image: v.string(),
    provider: v.string(), // "google" | "github"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["id"])
    .index("by_email", ["email"]),

  // Organizations table
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    createdByUserId: v.string(), // NextAuth user id (sub)
    plan: v.string(), // free | pro | enterprise
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["createdByUserId"])
    .index("by_slug", ["slug"]),

  // Memberships table
  memberships: defineTable({
    orgId: v.string(),
    userId: v.string(),
    role: v.string(), // owner | admin | analyst | viewer
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"]),

  // Projects table - belongs to an organization
  projects: defineTable({
    orgId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdByUserId: v.string(),
    status: v.string(), // "active" | "archived"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"]),

  // Assessments table - belongs to a project
  assessments: defineTable({
    projectId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // "blackbox" | "whitebox"
    targetType: v.string(), // "web_app" | "api" | "mobile" | "network"
    targetUrl: v.optional(v.string()),
    status: v.string(), // "pending" | "running" | "completed" | "failed"
    createdByUserId: v.string(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"]),

  // Findings table - belongs to an assessment
  findings: defineTable({
    assessmentId: v.string(),
    title: v.string(),
    description: v.string(),
    severity: v.string(), // "critical" | "high" | "medium" | "low" | "info"
    status: v.string(), // "open" | "confirmed" | "false_positive" | "resolved"
    cweId: v.optional(v.string()), // Common Weakness Enumeration ID
    cvssScore: v.optional(v.number()), // CVSS score 0-10
    location: v.optional(v.string()), // Where the finding was discovered
    evidence: v.optional(v.string()), // Evidence/proof of the finding
    remediation: v.optional(v.string()), // How to fix it
    createdByUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_assessment", ["assessmentId"])
    .index("by_assessment_severity", ["assessmentId", "severity"])
    .index("by_assessment_status", ["assessmentId", "status"]),

  // Results table - scan results/data from an assessment
  results: defineTable({
    assessmentId: v.string(),
    type: v.string(), // "scan_data" | "vulnerability" | "configuration" | "log"
    data: v.string(), // JSON string of the result data
    metadata: v.optional(v.string()), // Additional metadata as JSON
    createdByUserId: v.string(),
    createdAt: v.number(),
  }).index("by_assessment", ["assessmentId"]),
});

