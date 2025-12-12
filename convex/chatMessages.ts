// convex/chatMessages.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new chat thread
 */
export const createThread = mutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const threadId = await ctx.db.insert("chatThreads", {
      userId: args.userId,
      title: args.title || "New Chat",
      createdAt: now,
      updatedAt: now,
    });

    return threadId;
  },
});

/**
 * Get all chat threads for a user (ordered by most recent)
 */
export const getThreads = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50); // Get last 50 threads

    return threads;
  },
});

/**
 * Get chat messages for a specific thread
 */
export const getMessagesByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread_created", (q) => q.eq("threadId", args.threadId))
      .order("asc") // Oldest first for display
      .collect();

    return messages;
  },
});

/**
 * Get the first user message from a thread (for generating title)
 */
export const getFirstUserMessage = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread_created", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .filter((q) => q.eq(q.field("role"), "user"))
      .first();

    return messages?.content || null;
  },
});

/**
 * Save a new chat message to a thread
 */
export const saveMessage = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      userId: args.userId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });

    // Update thread's updatedAt timestamp
    await ctx.db.patch(args.threadId as any, {
      updatedAt: Date.now(),
    });

    // Auto-generate title from first user message if thread has no title
    const thread = await ctx.db.get(args.threadId as any);
    if (thread && "title" in thread && args.role === "user") {
      const threadTitle = (thread as any).title;
      if (!threadTitle || threadTitle === "New Chat") {
        const title = args.content.slice(0, 50).trim();
        if (title) {
          await ctx.db.patch(args.threadId as any, {
            title: title.length < args.content.length ? `${title}...` : title,
          });
        }
      }
    }

    return messageId;
  },
});

/**
 * Delete a chat thread and all its messages
 */
export const deleteThread = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    // Delete all messages in the thread
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));

    // Delete the thread
    await ctx.db.delete(args.threadId as any);

    return { deleted: messages.length };
  },
});

/**
 * Update thread title
 */
export const updateThreadTitle = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId as any, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

