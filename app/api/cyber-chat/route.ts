import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

interface ChatRequestBody {
  messages?: Array<{ role: string; content: string }>;
}

type GoogleContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

const SYSTEM_PROMPT = `You are CHACK's Cyber Sentinel: a world-class cybersecurity co-pilot that blends red-team curiosity with
blue-team rigor. Provide concise, actionable guidance rooted in best practices. Offer detection ideas, validation steps, and
remediation paths. Never encourage illegal access, data exfiltration, or harm. Keep advice educational, defensive-forward,
and explicitly warn against executing untrusted payloads.`;

const GOOGLE_MODEL = process.env.GOOGLE_MODEL?.trim() || "gemini-1.5-pro";
const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:streamGenerateContent`;

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitBuckets = new Map<string, { windowStart: number; count: number }>();

function isRateLimited(key: string) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    rateLimitBuckets.set(key, { windowStart: now, count: 1 });
    return false;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  bucket.count += 1;
  return false;
}

function normalizeMessages(messages: ChatRequestBody["messages"]): GoogleContent[] {
  if (!messages) return [];

  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-12)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content.slice(0, 6000) }],
    }));
}

function parseGoogleStream(response: Response) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (!response.body) {
    throw new Error("Empty response body from Google Generative AI");
  }

  const reader = response.body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line === "data: [DONE]") continue;
            if (!line.startsWith("data:")) continue;

            const payload = line.replace(/^data:\s*/, "");
            try {
              const json = JSON.parse(payload);
              const parts =
                json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "") ?? [];
              const text = parts.join("");
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            } catch (error) {
              console.error("Failed to parse Google stream chunk", error);
            }
          }
        }

        // Handle any remaining buffered line
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data:")) {
          const payload = trimmed.replace(/^data:\s*/, "");
          try {
            const json = JSON.parse(payload);
            const parts =
              json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "") ?? [];
            const text = parts.join("");
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          } catch (error) {
            console.error("Failed to parse trailing Google stream chunk", error);
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json({ error: "Missing GOOGLE_API_KEY" }, { status: 500 });
  }

  if (isRateLimited(session.user.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const normalizedMessages = normalizeMessages(body.messages);

  const payload = {
    systemInstruction: {
      role: "system",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: normalizedMessages,
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 800,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  try {
    const response = await fetch(`${GOOGLE_API_URL}?key=${process.env.GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Generative AI error", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to contact the AI assistant", details: errorText },
        { status: response.status }
      );
    }

    const stream = parseGoogleStream(response);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("Unexpected error while streaming from Google", error);
    return NextResponse.json(
      { error: "Unexpected error while streaming from Google", details: error?.message },
      { status: 500 }
    );
  }
}
