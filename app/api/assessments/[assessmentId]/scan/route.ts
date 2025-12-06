// app/api/assessments/[assessmentId]/scan/route.ts

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const API_URL = process.env.ASSESSMENT_API_URL || "https://chack.ngrok.app";
const APP_NAME = process.env.ASSESSMENT_APP_NAME || "Nassa";

// NOTE: Report checking is REMOVED
// Reports are now ONLY fetched when user clicks "Generate Report" button
// This function is kept for reference but not used anymore
/*
async function checkAndUpdateReport(
  assessmentId: string,
  sessionId: string,
  scanType: string
): Promise<void> {
  console.log(`[Report Check] Attempting to fetch report for session: ${sessionId}`);
  
  try {
    // Call the report API  
    const reportApiUrl = `${API_URL}/api/reports/${sessionId}`;
    
    const reportResponse = await fetch(reportApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!reportResponse.ok) {
      console.log(`[Report Check] Report not ready yet (${reportResponse.status})`);
      return;
    }

    const reportData = await reportResponse.json();
    
    if (!reportData || !reportData.report) {
      console.log(`[Report Check] No report data available`);
      return;
    }

    console.log(`[Report Check] ✅ Report found! Updating assessment...`);

    // Parse the report and update assessment
    await fetchMutation(api.assessments.parseReport, {
      assessmentId,
      report: reportData.report,
      userId: "system",
    });

    // Update assessment status to completed
    await fetchMutation(api.assessments.updateStatus, {
      assessmentId,
      status: "completed",
      completedAt: Date.now(),
    });

    console.log(`[Report Check] ✅ Assessment marked as completed with report data`);
  } catch (error) {
    console.log(`[Report Check] Error:`, error);
    throw error;
  }
}
*/

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  const { assessmentId } = await params;
  
  // Get user session to extract email
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Use email username as userId (matching curl command format: waqasobeidy from email)
  const userEmail = session.user.email;
  
  if (!userEmail) {
    return new Response(JSON.stringify({ error: "User email not found in session" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extract username from email (e.g., "waqasobeidy@example.com" -> "waqasobeidy")
  const userId = userEmail.split('@')[0];

  // Safely parse request body for targetUrl, gitRepoUrl, and type
  let body: any = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch (error) {
    console.error("[Scan API] Failed to parse request body:", error);
    return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { targetUrl, gitRepoUrl, type } = body;

  if (!targetUrl && !gitRepoUrl) {
    return new Response(JSON.stringify({ error: "targetUrl or gitRepoUrl is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Generate UNIQUE session ID using assessment ID + timestamp
  // Format: {type}_{assessmentId}_{timestamp}
  // Example: blackbox_k57abc123_1733600000
  const timestamp = Math.floor(Date.now() / 1000);
  const scanType = type || 'blackbox';
  const sessionId = `${scanType}_${assessmentId}_${timestamp}`;

  try {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[Scan API] ===== STARTING NEW SCAN REQUEST =====`);
    console.log(`[Scan API] Assessment ID: ${assessmentId}`);
    console.log(`[Scan API] User ID (email): ${userId}`);
    console.log(`[Scan API] Type: ${type}`);
    console.log(`[Scan API] Target URL: ${targetUrl || "N/A"}`);
    console.log(`[Scan API] Git Repo URL: ${gitRepoUrl || "N/A"}`);
    console.log(`[Scan API] Session ID (UNIQUE): ${sessionId}`);
    console.log(`[Scan API] Timestamp: ${timestamp}`);
    console.log(`[Scan API] API_URL: ${API_URL}`);
    console.log(`[Scan API] APP_NAME: ${APP_NAME}`);
    console.log(`${"=".repeat(80)}\n`);

    // Step 1: Create session
    const sessionUrl = `${API_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`;
    console.log(`[Scan API] STEP 1: Creating session`);
    console.log(`[Scan API] Session URL: ${sessionUrl}`);
    console.log(`[Scan API] Session ID: ${sessionId}`);
    console.log(`[Scan API] Making POST request to create session...`);
    
    const sessionResponse = await fetch(sessionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    console.log(`[Scan API] Session response status: ${sessionResponse.status} ${sessionResponse.statusText}`);

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error(`[Scan API] ❌ Session creation failed: ${sessionResponse.status} - ${errorText}`);
      throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
    }

    const sessionData = await sessionResponse.json();
    console.log(`[Scan API] ✅ Session created successfully!`);
    console.log(`[Scan API] Session data:`, JSON.stringify(sessionData, null, 2));

    // Step 2: Start scan with SSE
    console.log(`\n[Scan API] STEP 2: Starting SSE scan`);
    
    // Build the scan command based on type (matching Python reference)
    const scanTarget = (type === "whitebox" && gitRepoUrl && gitRepoUrl.trim()) 
      ? gitRepoUrl.trim() 
      : (targetUrl && targetUrl.trim() ? targetUrl.trim() : null);

    if (!scanTarget) {
      console.error(`[Scan API] ❌ No scan target provided!`);
      throw new Error("Either targetUrl (for blackbox) or gitRepoUrl (for whitebox) must be provided");
    }

    const scanCommand = `scan ${scanTarget}`;
    const scanUrl = `${API_URL}/run_sse`;
    
    console.log(`[Scan API] Scan target: ${scanTarget}`);
    console.log(`[Scan API] Scan command: "${scanCommand}"`);
    console.log(`[Scan API] SSE endpoint: ${scanUrl}`);
    
    // Payload format matches Python reference exactly:
    // {
    //   "appName": APP_NAME,
    //   "userId": USER_ID,
    //   "sessionId": SESSION_ID,
    //   "newMessage": {
    //     "role": "user",
    //     "parts": [{"text": f"scan {target_url}"}]
    //   },
    //   "streaming": False
    // }
    const scanPayload = {
      appName: APP_NAME,
      userId: userId, // User's email from session
      sessionId: sessionId,
      newMessage: {
        role: "user",
        parts: [{ text: scanCommand }],
      },
      streaming: false,
    };

    console.log(`\n[Scan API] 📤 PAYLOAD TO BE SENT TO ${scanUrl}:`);
    console.log(`[Scan API] Payload structure:`, JSON.stringify(scanPayload, null, 2));
    console.log(`[Scan API] Payload keys:`, Object.keys(scanPayload));
    console.log(`[Scan API] appName: "${scanPayload.appName}"`);
    console.log(`[Scan API] userId: "${scanPayload.userId}"`);
    console.log(`[Scan API] sessionId: "${scanPayload.sessionId}"`);
    console.log(`[Scan API] newMessage.role: "${scanPayload.newMessage.role}"`);
    console.log(`[Scan API] newMessage.parts[0].text: "${scanPayload.newMessage.parts[0].text}"`);
    console.log(`[Scan API] streaming: ${scanPayload.streaming}`);
    
    console.log(`\n[Scan API] Making POST request to ${scanUrl}...`);
    console.log(`[Scan API] Request headers: Content-Type: application/json`);
    console.log(`[Scan API] Request body: ${JSON.stringify(scanPayload)}`);

    const scanResponse = await fetch(scanUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scanPayload),
    });

    console.log(`\n[Scan API] 📥 Response received from ${scanUrl}`);
    console.log(`[Scan API] Response status: ${scanResponse.status} ${scanResponse.statusText}`);
    console.log(`[Scan API] Response headers:`, Object.fromEntries(scanResponse.headers.entries()));

    if (!scanResponse.ok) {
      const errorText = await scanResponse.text();
      console.error(`[Scan API] ❌ SSE scan failed: ${scanResponse.status} - ${errorText}`);
      throw new Error(`Failed to start scan: ${scanResponse.statusText} - ${errorText}`);
    }

    if (!scanResponse.body) {
      console.error(`[Scan API] ❌ No response body received`);
      throw new Error("No response body");
    }

    console.log(`[Scan API] ✅ SSE scan started successfully!`);
    console.log(`[Scan API] Beginning to stream response...`);

    // Stream the SSE response back to the client
    const reader = scanResponse.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let eventCount = 0;
        let isClosed = false;
        let lastEventId: string | null = null;

        // Check if client wants to resume from a specific event
        const clientLastEventId = request.headers.get("Last-Event-ID");
        if (clientLastEventId) {
          console.log(`[Scan API] Client requesting resume from event ID: ${clientLastEventId}`);
          lastEventId = clientLastEventId;
        }

        // Helper to safely enqueue data
        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch (error: any) {
              if (error?.code === 'ERR_INVALID_STATE' || error?.message?.includes('closed')) {
                console.log(`[Scan API] Stream already closed, stopping enqueue`);
                isClosed = true;
              } else {
                throw error;
              }
            }
          }
        };

        try {
          while (!isClosed) {
            const { done, value } = await reader.read();

            if (done) {
              console.log(`[Scan API] Stream completed. Total events: ${eventCount}`);
              if (!isClosed) {
                controller.close();
                isClosed = true;
              }
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Process complete lines (SSE format: "data: ...\n\n")
            while (buffer.includes("\n\n") || buffer.includes("\r\n\r\n")) {
              const delimiter = buffer.includes("\n\n") ? "\n\n" : "\r\n\r\n";
              const eventEnd = buffer.indexOf(delimiter);
              
              if (eventEnd === -1) break;

              const eventText = buffer.slice(0, eventEnd);
              buffer = buffer.slice(eventEnd + delimiter.length);

              if (eventText.trim() && !isClosed) {
                eventCount++;
                
                // Handle SSE event format
                let dataLine = "";
                let eventType = "";
                
                for (const line of eventText.split("\n")) {
                  if (line.startsWith("data: ")) {
                    dataLine = line.slice(6);
                  } else if (line.startsWith("event: ")) {
                    eventType = line.slice(7);
                  }
                }

                // If we have data, forward it with event ID
                if (dataLine) {
                  // Generate event ID for this event
                  const currentEventId = `${sessionId}-${eventCount}`;
                  lastEventId = currentEventId;
                  
                  const output = eventType 
                    ? `id: ${currentEventId}\nevent: ${eventType}\ndata: ${dataLine}\n\n`
                    : `id: ${currentEventId}\ndata: ${dataLine}\n\n`;
                  
                  safeEnqueue(new TextEncoder().encode(output));
                  
                  // Log first few events for debugging
                  if (eventCount <= 3) {
                    try {
                      const parsed = JSON.parse(dataLine);
                      console.log(`[Scan API] Event ${eventCount}:`, parsed.author || "unknown", parsed.content?.parts?.[0]?.text?.substring(0, 50) || "");
                    } catch (e) {
                      console.log(`[Scan API] Event ${eventCount}:`, dataLine.substring(0, 100));
                    }
                  }
                } else if (eventText.trim().startsWith("data:")) {
                  // Handle case where data: is on its own line
                  const data = eventText.trim().slice(5).trim();
                  safeEnqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                }
              }
            }
          }
        } catch (error) {
          console.log(`[Scan API] Stream error:`, error);
          if (!isClosed) {
            try {
              controller.error(error);
            } catch (e) {
              // Controller already closed, ignore
            }
            isClosed = true;
          }
        } finally {
          // Stream finished
          console.log(`[Scan API] Stream ended. Report will be generated when user clicks button.`);
          // NOTE: We do NOT call checkAndUpdateReport() here anymore
          // Report is ONLY fetched when user explicitly clicks "Generate Report" button
        }
      },
      cancel() {
        console.log(`[Scan API] Stream cancelled by client`);
        // NOTE: We do NOT call checkAndUpdateReport() here anymore
        // Report is ONLY fetched when user explicitly clicks "Generate Report" button
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Session-ID": sessionId, // Include session ID in response headers
      },
    });
  } catch (error) {
    console.error(`\n${"=".repeat(80)}`);
    console.error(`[Scan API] ❌ ERROR OCCURRED:`);
    console.error(`[Scan API] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`[Scan API] Error message:`, error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(`[Scan API] Stack trace:`, error.stack);
    }
    console.error(`${"=".repeat(80)}\n`);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

