# Chatbot Tools Implementation Plan

## Overview
Enhance the AI chatbot to use Vercel AI SDK tools for calling Convex database and retrieving real-time organization data. The AI will never fabricate organization information and will always fetch it from the database.

## Architecture

```
User Query → Chat API → Vercel AI SDK (with tools) → Tool Execution → Convex Query → Response
```

## Implementation Steps

### 1. Create Convex Query for Organization Data

**File**: `convex/organizations.ts`

Add a new query function to get the current user's default organization with all required fields:

```typescript
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

    // Return only the fields needed for the chatbot
    return {
      name: org.name,
      slug: org.slug,
      plan: org.plan || "free",
      credits: ("credits" in org ? (org.credits as number | undefined) : undefined) ?? 0,
      role: membership.role,
    };
  },
});
```

### 2. Create API Route for Tool Execution

**File**: `app/api/chat/tools/route.ts` (new file)

This route will be called by the chat API to execute tools securely:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { toolName, args } = await req.json();

    if (toolName === "getOrganizationInfo") {
      const orgInfo = await fetchQuery(api.organizations.getOrgInfoForChat, {
        userId: session.user.id,
      });

      if (!orgInfo) {
        return NextResponse.json({
          success: false,
          message: "No organization found. Please complete onboarding first.",
        });
      }

      return NextResponse.json({
        success: true,
        data: orgInfo,
      });
    }

    return NextResponse.json(
      { error: "Unknown tool" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Tool execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute tool" },
      { status: 500 }
    );
  }
}
```

### 3. Update Chat API Route with Tools

**File**: `app/api/chat/route.ts`

Modify to include Vercel AI SDK tools:

```typescript
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if Google AI is configured
    if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Please contact support." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const messages = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const modelMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const model = google("gemini-2.5-flash");

    // Define the tool for getting organization info
    const getOrganizationInfo = tool({
      description: "Get the current user's organization information including name, credits, plan, and slug. Use this when the user asks about their organization, credits, plan, or subscription.",
      parameters: z.object({}), // No parameters needed - uses session user ID
      execute: async () => {
        // Call the tools API route to execute the query
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/api/chat/tools`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Forward the authorization cookie
            Cookie: req.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            toolName: "getOrganizationInfo",
            args: {},
          }),
        });

        if (!response.ok) {
          return {
            error: "Failed to fetch organization information",
          };
        }

        const result = await response.json();
        return result;
      },
    });

    // Stream the response with tools
    const result = await streamText({
      model,
      messages: modelMessages,
      tools: {
        getOrganizationInfo,
      },
      temperature: 0.7,
      topP: 0.9,
      maxSteps: 5, // Allow up to 5 tool calls in a conversation turn
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while processing your request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### 4. Update System Prompt (Optional but Recommended)

Add a system message to guide the AI on when to use tools:

```typescript
const systemMessage = {
  role: "system" as const,
  content: `You are a helpful AI assistant for CHACK, a cybersecurity assessment platform. 
When users ask about their organization, credits, plan, or subscription, you MUST use the getOrganizationInfo tool to fetch real data from the database. 
Never make up or guess organization information. If no organization is found, inform the user they need to complete onboarding.`,
};

// Prepend to modelMessages
const modelMessages = [
  systemMessage,
  ...messages.map((msg: any) => ({
    role: msg.role,
    content: msg.content,
  })),
];
```

### 5. Handle Tool Calls in Client (if needed)

**File**: `components/ai-chatbot.tsx`

The Vercel AI SDK automatically handles tool calls in streaming responses, so no client-side changes are needed. The tool results will be automatically injected into the conversation.

## Security Considerations

1. **Authentication**: All tool calls are authenticated via session
2. **User Isolation**: Tools only return data for the authenticated user
3. **No Sensitive Data**: Only return necessary fields (name, slug, plan, credits)
4. **Error Handling**: Graceful fallbacks if organization not found

## Testing Checklist

- [ ] User asks "What's my organization name?" → Should call tool and return real name
- [ ] User asks "How many credits do I have?" → Should call tool and return real credits
- [ ] User asks "What plan am I on?" → Should call tool and return real plan
- [ ] User asks "What's my organization slug?" → Should call tool and return real slug
- [ ] User with no organization → Should return helpful message
- [ ] Multiple questions in one message → Should handle multiple tool calls
- [ ] General questions (not about org) → Should not call tool unnecessarily

## Benefits

1. **Real-time Data**: Always fetches latest organization data
2. **No Fabrication**: AI never makes up organization information
3. **Better UX**: Users get accurate answers about their account
4. **Extensible**: Easy to add more tools (projects, assessments, etc.)
5. **Type-safe**: Using Zod for parameter validation

## Future Enhancements

1. Add tool for fetching projects: `getProjects`
2. Add tool for fetching assessments: `getAssessments`
3. Add tool for fetching credit transactions: `getCreditHistory`
4. Add tool for checking GitHub connection status: `getGitHubStatus`
5. Add tool for subscription details: `getSubscriptionDetails`

## Dependencies

- `ai` package (already installed)
- `zod` package (need to install: `npm install zod`)
- Vercel AI SDK supports tools out of the box

## Migration Notes

- No breaking changes to existing chat functionality
- Tools are optional - if tool call fails, AI continues normally
- Backward compatible with existing chat history

