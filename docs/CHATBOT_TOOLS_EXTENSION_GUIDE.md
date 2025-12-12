# Chatbot Tools Extension Guide

## Overview
This guide shows you how to extend the chatbot with additional tools to access more data from your database.

## Current Tool
- ✅ `getOrganizationInfo` - Returns organization name, credits, plan, slug

## Pattern for Adding New Tools

### Step 1: Create a Convex Query
Add a new query function in the appropriate Convex file (e.g., `convex/projects.ts`, `convex/assessments.ts`):

```typescript
// convex/projects.ts
export const getProjectsForChat = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get user's default org
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!membership) return null;

    // Get projects for the org
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", membership.orgId))
      .collect();

    return projects.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description || "",
      status: p.status,
      createdAt: p.createdAt,
    }));
  },
});
```

### Step 2: Add Tool to Chat API
In `app/api/chat/route.ts`, add the new tool:

```typescript
const getProjects = tool({
  description: `Get all projects for the current user. Use this when the user asks about:
  - Their projects
  - What projects they have
  - List of projects
  - Project names`,
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const projects = await fetchQuery(api.projects.getProjectsForChat, {
        userId: session.user.id,
      });
      
      if (!projects || projects.length === 0) {
        return { success: false, message: "No projects found." };
      }
      
      return { success: true, data: projects };
    } catch (error) {
      return { success: false, error: "Failed to fetch projects." };
    }
  },
});

// Add to tools object:
tools: {
  getOrganizationInfo,
  getProjects, // Add here
}
```

## Suggested Tools to Add

### 1. Projects Information
**Use Cases:**
- "What projects do I have?"
- "List my projects"
- "How many projects are there?"

**Query:** `convex/projects.ts`
```typescript
export const getProjectsForChat = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!membership) return null;

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", membership.orgId))
      .collect();

    return projects.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description || "",
      status: p.status,
      projectCount: projects.length,
    }));
  },
});
```

### 2. Assessments Status
**Use Cases:**
- "What assessments are running?"
- "Show me my recent assessments"
- "How many assessments have I completed?"

**Query:** `convex/assessments.ts`
```typescript
export const getAssessmentsForChat = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!membership) return null;

    // Get all projects for the org
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", membership.orgId))
      .collect();

    // Get assessments across all projects
    const allAssessments = [];
    for (const project of projects) {
      const assessments = await ctx.db
        .query("assessments")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .order("desc")
        .take(args.limit || 10);
      
      for (const assessment of assessments) {
        allAssessments.push({
          id: assessment._id,
          name: assessment.name,
          type: assessment.type,
          status: assessment.status,
          projectName: project.name,
          createdAt: assessment.createdAt,
        });
      }
    }

    return {
      total: allAssessments.length,
      assessments: allAssessments.sort((a, b) => b.createdAt - a.createdAt),
      byStatus: {
        running: allAssessments.filter(a => a.status === "running").length,
        completed: allAssessments.filter(a => a.status === "completed").length,
        failed: allAssessments.filter(a => a.status === "failed").length,
      },
    };
  },
});
```

### 3. Credit History
**Use Cases:**
- "Show my credit transactions"
- "What did I use credits for?"
- "When did I last use credits?"

**Query:** `convex/creditTransactions.ts` (create if doesn't exist)
```typescript
export const getCreditHistoryForChat = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!membership) return null;

    const org = await ctx.db.get(membership.orgId as any);
    if (!org) return null;

    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_org_created", (q) => q.eq("orgId", membership.orgId))
      .order("desc")
      .take(args.limit || 10);

    return {
      currentCredits: ("credits" in org ? (org.credits as number | undefined) : undefined) ?? 0,
      transactions: transactions.map(t => ({
        type: t.type,
        amount: t.amount,
        description: t.description,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
      })),
    };
  },
});
```

### 4. Recent Findings/Vulnerabilities
**Use Cases:**
- "What vulnerabilities were found?"
- "Show me critical findings"
- "How many high-severity issues do I have?"

**Query:** `convex/findings.ts` (create if doesn't exist)
```typescript
export const getFindingsForChat = query({
  args: { userId: v.string(), severity: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!membership) return null;

    // Get all projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", membership.orgId))
      .collect();

    // Get all assessments
    const allAssessments = [];
    for (const project of projects) {
      const assessments = await ctx.db
        .query("assessments")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      allAssessments.push(...assessments);
    }

    // Get findings
    const allFindings = [];
    for (const assessment of allAssessments) {
      const findings = await ctx.db
        .query("findings")
        .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment._id))
        .filter(args.severity ? (q) => q.eq(q.field("severity"), args.severity) : undefined)
        .collect();
      allFindings.push(...findings);
    }

    return {
      total: allFindings.length,
      bySeverity: {
        critical: allFindings.filter(f => f.severity === "critical").length,
        high: allFindings.filter(f => f.severity === "high").length,
        medium: allFindings.filter(f => f.severity === "medium").length,
        low: allFindings.filter(f => f.severity === "low").length,
      },
      recent: allFindings
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(f => ({
          title: f.title,
          severity: f.severity,
          status: f.status,
          createdAt: f.createdAt,
        })),
    };
  },
});
```

### 5. GitHub Connection Status
**Use Cases:**
- "Is my GitHub connected?"
- "What GitHub repos do I have access to?"

**Query:** `convex/githubTokens.ts`
```typescript
export const getGitHubStatusForChat = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const oauthToken = await ctx.db
      .query("githubTokens")
      .withIndex("by_user_type", (q) => 
        q.eq("userId", args.userId).eq("tokenType", "oauth")
      )
      .first();

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("id", args.userId))
      .first();

    return {
      connected: !!oauthToken,
      username: user?.githubUsername || null,
      accountId: user?.githubAccountId || null,
    };
  },
});
```

### 6. Subscription Details
**Use Cases:**
- "When does my subscription expire?"
- "What's my subscription status?"
- "When was my last payment?"

**Query:** `convex/subscriptions.ts`
```typescript
export const getSubscriptionDetailsForChat = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!membership) return null;

    const org = await ctx.db.get(membership.orgId as any);
    if (!org) return null;

    return {
      plan: ("plan" in org ? org.plan : "free") as string,
      status: ("stripeStatus" in org ? org.stripeStatus : undefined) as string | undefined,
      currentPeriodEnd: ("stripeCurrentPeriodEnd" in org 
        ? org.stripeCurrentPeriodEnd 
        : undefined) as number | undefined,
      subscriptionId: ("stripeSubscriptionId" in org 
        ? org.stripeSubscriptionId 
        : undefined) as string | undefined,
    };
  },
});
```

## Complete Example: Adding Projects Tool

### 1. Add Query to `convex/projects.ts`:
```typescript
export const getProjectsForChat = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!membership) return null;

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", membership.orgId))
      .collect();

    return projects.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description || "",
      status: p.status,
      createdAt: p.createdAt,
    }));
  },
});
```

### 2. Add Tool to `app/api/chat/route.ts`:
```typescript
// After getOrganizationInfo tool definition
const getProjects = tool({
  description: `Get all projects for the current user. Use this when the user asks about:
  - Their projects
  - What projects they have
  - List of projects
  - Project names
  - How many projects`,
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log("\n🔧 === TOOL EXECUTION START ===");
      console.log("🔧 Tool: getProjects");
      
      const projects = await fetchQuery(api.projects.getProjectsForChat, {
        userId: session.user.id,
      });

      console.log("🔧 Projects retrieved:", projects?.length || 0);

      if (!projects || projects.length === 0) {
        return { success: false, message: "No projects found." };
      }

      return { success: true, data: projects };
    } catch (error) {
      console.error("🔧 ❌ Tool execution error:", error);
      return { success: false, error: "Failed to fetch projects." };
    }
  },
});

// Update tools object:
tools: {
  getOrganizationInfo,
  getProjects, // Add new tool here
}
```

### 3. Update System Prompt:
```typescript
const systemMessage = {
  role: "system" as const,
  content: `You are a helpful AI assistant for CHACK, a cybersecurity assessment platform. 

When users ask about:
- Organization, credits, plan, subscription → use getOrganizationInfo
- Projects → use getProjects
- Assessments → use getAssessments
- Findings/vulnerabilities → use getFindings
- Credit history → use getCreditHistory

Always use the appropriate tool to fetch real data. Never make up information.`,
};
```

## Best Practices

### 1. **Keep Tools Read-Only**
- Always use `query`, never `mutation`
- Always use `fetchQuery`, never `fetchMutation`
- Only return data, never modify it

### 2. **User Scoping**
- Always filter by `userId` or `orgId` from membership
- Never return data from other users/organizations
- Validate user has access to the data

### 3. **Tool Descriptions**
- Be specific about when to use the tool
- List common question patterns
- Make it clear what data is returned

### 4. **Error Handling**
- Always return `{ success: boolean, ... }` format
- Provide helpful error messages
- Log errors for debugging

### 5. **Data Minimization**
- Only return fields needed for the chatbot
- Don't expose sensitive internal IDs
- Format dates/timestamps appropriately

### 6. **Performance**
- Use indexes for queries
- Limit result sets (e.g., `take(10)`)
- Consider pagination for large datasets

## Testing New Tools

1. **Test the Convex query directly:**
```typescript
// In Convex dashboard or test file
const result = await ctx.runQuery(api.projects.getProjectsForChat, {
  userId: "test-user-id"
});
console.log(result);
```

2. **Test the tool in chatbot:**
- Ask: "What projects do I have?"
- Check server logs for tool execution
- Verify response is accurate

3. **Verify read-only:**
- Confirm no `mutation` or `fetchMutation` calls
- Test that data isn't modified

## Priority Recommendations

**High Priority:**
1. ✅ `getOrganizationInfo` (already done)
2. `getProjects` - Most common user question
3. `getAssessments` - Core feature visibility

**Medium Priority:**
4. `getCreditHistory` - Transparency for users
5. `getSubscriptionDetails` - Billing questions

**Low Priority:**
6. `getFindings` - Detailed security info
7. `getGitHubStatus` - Integration status

## Example: Complete Multi-Tool Setup

```typescript
// app/api/chat/route.ts
tools: {
  getOrganizationInfo,
  getProjects,
  getAssessments,
  getCreditHistory,
  getSubscriptionDetails,
}
```

The AI will automatically choose the right tool(s) based on the user's question!

