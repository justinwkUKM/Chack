// app/api/chat/route.ts

import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { z } from "zod";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    console.log("\n=== CHAT API REQUEST START ===");
    
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("❌ No session found");
      return new Response("Unauthorized", { status: 401 });
    }
    console.log("✅ User authenticated:", session.user.id);

    // Check if Google AI is configured
    if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.log("❌ Google AI not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Please contact support." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log("✅ Google AI configured");

    const body = await req.json();
    const messages = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log("❌ No messages in request");
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("📨 Received messages:", JSON.stringify(messages, null, 2));

    // Convert messages to ModelMessages format
    const modelMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    console.log("🔄 Converted to model messages:", JSON.stringify(modelMessages, null, 2));

    // Initialize Google AI model
    const model = google("gemini-2.5-flash");

    // Define the tool for getting organization info
    const getOrganizationInfo = tool({
      description: `Get the current user's organization information including name, credits, plan, and slug. 
      Use this tool when the user asks about:
      - Their organization name
      - How many credits they have
      - What plan they are on (free, pro, enterprise)
      - Their organization slug
      - Their subscription status
      - Account information
      Never make up or guess organization information. Always use this tool to fetch real data.`,
      inputSchema: z.object({}), // No parameters needed - uses session user ID
      execute: async (_args: {}) => {
        try {
          console.log("\n🔧 === TOOL EXECUTION START ===");
          console.log("🔧 Tool: getOrganizationInfo");
          console.log("🔧 User ID:", session.user.id);
          
          // Call Convex directly to get organization info
          const orgInfo = await fetchQuery(api.organizations.getOrgInfoForChat, {
            userId: session.user.id,
          });

          console.log("🔧 Database query result:", JSON.stringify(orgInfo, null, 2));

          if (!orgInfo) {
            const result = {
              success: false,
              message: "No organization found. Please complete onboarding first.",
            };
            console.log("🔧 Tool result (no org):", JSON.stringify(result, null, 2));
            console.log("🔧 === TOOL EXECUTION END ===\n");
            return result;
          }

          const result = {
            success: true,
            data: orgInfo,
          };
          console.log("🔧 Tool result (success):", JSON.stringify(result, null, 2));
          console.log("🔧 === TOOL EXECUTION END ===\n");
          return result;
        } catch (error) {
          console.error("🔧 ❌ Tool execution error:", error);
          const result = {
            success: false,
            error: `An error occurred while fetching organization information: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
          console.log("🔧 Tool result (error):", JSON.stringify(result, null, 2));
          console.log("🔧 === TOOL EXECUTION END ===\n");
          return result;
        }
      },
    });

    // Define the tool for getting assessments
    const getAssessments = tool({
      description: `Get the current user's security assessments including status, types, project names, completion dates, findings, and scan logs.
      Use this tool when the user asks about:
      - Their assessments
      - What assessments are running
      - Recent assessments
      - How many assessments they have completed
      - Assessment status
      - Scan reports or logs
      - Assessment results
      - Vulnerabilities found in assessments
      You can optionally filter by status (running, completed, failed, pending) or limit the number of results.`,
      inputSchema: z.object({
        status: z.optional(z.enum(["running", "completed", "failed", "pending"])),
        limit: z.optional(z.number().min(1).max(50)),
      }),
      execute: async (args) => {
        try {
          console.log("\n🔧 === TOOL EXECUTION START ===");
          console.log("🔧 Tool: getAssessments");
          console.log("🔧 User ID:", session.user.id);
          console.log("🔧 Args:", args);
          
          const assessments = await fetchQuery(api.assessments.getAssessmentsForChat, {
            userId: session.user.id,
            limit: args.limit,
            status: args.status,
          });

          console.log("🔧 Assessments retrieved:", assessments?.total || 0);

          if (!assessments || assessments.total === 0) {
            const result = {
              success: false,
              message: "No assessments found.",
            };
            console.log("🔧 Tool result (no assessments):", JSON.stringify(result, null, 2));
            console.log("🔧 === TOOL EXECUTION END ===\n");
            return result;
          }

          const result = {
            success: true,
            data: assessments,
          };
          console.log("🔧 Tool result (success):", JSON.stringify(result, null, 2));
          console.log("🔧 === TOOL EXECUTION END ===\n");
          return result;
        } catch (error) {
          console.error("🔧 ❌ Tool execution error:", error);
          const result = {
            success: false,
            error: `An error occurred while fetching assessments: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
          console.log("🔧 Tool result (error):", JSON.stringify(result, null, 2));
          console.log("🔧 === TOOL EXECUTION END ===\n");
          return result;
        }
      },
    });

    // Add system message to guide the AI
    // Get system prompt from environment variable or use default
    // Handle newlines in env var (replace \n with actual newlines)
    const defaultPrompt = `You are CHACK, a strict and enterprise-grade AI cybersecurity assistant.

When users ask about:
- Organization, credits, plan, subscription, account → use getOrganizationInfo tool
- Assessments, scans, reports, logs, vulnerabilities → use getAssessments tool

Assessment rules:
1. Always call getAssessments to retrieve assessment data (status, type, project, findings, logs)
2. If the user requests a specific assessment, report, or logs → call getAssessments with appropriate filters
3. After tool results, summarize clearly, highlight severity, impact, and recommended defensive actions
4. For scan logs and reports, provide a concise summary of key events and recent activity

Cybersecurity expertise requirements:
- Provide high-level, safe guidance in ethical hacking (OWASP, MITRE ATT&CK, PTES) and defensive security (NIST, CIS, Zero Trust)
- Never provide exploit code, attack steps, evasion techniques, or unsafe instructions
- Maintain accuracy, compliance alignment, and tenant isolation

Behavior rules:
- Never guess or fabricate data; always use the correct tool first
- If no tool data is returned, inform the user clearly
- For general cybersecurity questions, answer directly without using tools
- Decline harmful or unethical requests and redirect to safe guidance`;

    const systemPrompt = process.env.CHATBOT_SYSTEM_PROMPT
      ? process.env.CHATBOT_SYSTEM_PROMPT.replace(/\\n/g, '\n')
      : defaultPrompt;

    const systemMessage = {
      role: "system" as const,
      content: systemPrompt,
    };

    // Prepend system message to conversation
    const messagesWithSystem = [systemMessage, ...modelMessages];
    
    console.log("💬 Total messages to model:", messagesWithSystem.length);

    // Stream the response with tools
    console.log("🚀 Starting streamText...");
    
    const result = await streamText({
      model,
      messages: messagesWithSystem,
      tools: {
        getOrganizationInfo,
        getAssessments,
      },
      stopWhen: () => false, // Never stop early - allow tool calls and text generation
      temperature: 0.7,
      topP: 0.9,
      async onStepFinish(stepResult) {
        console.log(`\n📊 === STEP FINISHED ===`);
        console.log("📊 Finish reason:", stepResult.finishReason);
        console.log("📊 Text length:", stepResult.text?.length || 0);
        console.log("📊 Text preview:", stepResult.text?.substring(0, 200) || "(no text)");
        console.log("📊 Tool calls count:", stepResult.toolCalls?.length || 0);
        console.log("📊 === STEP END ===\n");
      },
      async onFinish({ text, toolCalls, finishReason, usage }) {
        console.log("\n📊 === FINAL STREAM FINISHED ===");
        console.log("📊 Finish reason:", finishReason);
        console.log("📊 Final text length:", text?.length || 0);
        console.log("📊 Final text preview:", text?.substring(0, 200) || "(no text)");
        console.log("📊 Total tool calls:", toolCalls?.length || 0);
        console.log("📊 Usage:", JSON.stringify(usage, null, 2));
        console.log("📊 === FINAL STREAM FINISHED ===\n");
      },
    });

    console.log("✅ streamText created, returning response");
    console.log("=== CHAT API REQUEST END ===\n");

    // Return streaming response
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

