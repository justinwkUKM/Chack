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
  }).index("by_user", ["userId"]),

  // Targets table
  targets: defineTable({
    orgId: v.string(), // we store Convex table IDs as strings for now
    createdByUserId: v.string(),
    name: v.string(),
    mode: v.string(), // "blackbox" | "whitebox" later if you want
    type: v.string(), // "web_app" | "api" | ...
    primaryIdentifier: v.string(),
    verificationStatus: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),
});

