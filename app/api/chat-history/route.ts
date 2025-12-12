// app/api/chat-history/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

// GET - Fetch chat threads or messages for a specific thread
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (threadId) {
      // Get messages for a specific thread
      const messages = await fetchQuery(api.chatMessages.getMessagesByThread, {
        threadId,
      });
      return NextResponse.json(messages);
    } else {
      // Get all threads for the user
      const threads = await fetchQuery(api.chatMessages.getThreads, {
        userId: session.user.id,
      });
      return NextResponse.json(threads);
    }
  } catch (error) {
    console.error("Error fetching chat data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// POST - Create a new thread or save a message
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, threadId, role, content, title } = body;

    if (action === "createThread") {
      // Create a new thread
      const newThreadId = await fetchMutation(api.chatMessages.createThread, {
        userId: session.user.id,
        title: title || undefined,
      });

      const thread = await fetchQuery(api.chatMessages.getThreads, {
        userId: session.user.id,
      });
      const newThread = thread.find((t: any) => t._id === newThreadId);

      return NextResponse.json({ threadId: newThreadId, thread: newThread });
    } else if (action === "saveMessage") {
      // Save a message to a thread
      if (!threadId || !role || !content) {
        return NextResponse.json(
          { error: "threadId, role, and content are required" },
          { status: 400 }
        );
      }

      const messageId = await fetchMutation(api.chatMessages.saveMessage, {
        threadId,
        userId: session.user.id,
        role,
        content,
      });

      return NextResponse.json({ id: messageId, role, content });
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in POST chat-history:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a thread
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    const result = await fetchMutation(api.chatMessages.deleteThread, {
      threadId,
    });

    return NextResponse.json({
      message: "Thread deleted",
      deleted: result.deleted,
    });
  } catch (error) {
    console.error("Error deleting thread:", error);
    return NextResponse.json(
      { error: "Failed to delete thread" },
      { status: 500 }
    );
  }
}

