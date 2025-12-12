// components/ai-chatbot.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquare, Send, ChevronDown, Loader2, Trash2, Plus, History, X } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

type Thread = {
  _id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export function AiChatbot() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  const [showThreads, setShowThreads] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom within the chat container only (not the page)
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      // Use setTimeout to ensure DOM is fully updated
      const timeoutId = setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length]); // Only trigger on message count change, not content

  // Load threads on mount
  useEffect(() => {
    if (session) {
      loadThreads();
    }
  }, [session]);

  const loadThreads = async () => {
    try {
      const response = await fetch("/api/chat-history");
      if (response.ok) {
        const threadsData = await response.json();
        setThreads(threadsData);
        // If there are threads, load the most recent one
        if (threadsData.length > 0 && !currentThreadId) {
          loadThreadMessages(threadsData[0]._id);
        }
      }
    } catch (error) {
      console.error("Error loading threads:", error);
    }
  };

  const loadThreadMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat-history?threadId=${threadId}`);
      if (response.ok) {
        const history = await response.json();
        setMessages(
          history.map((msg: any) => ({
            id: msg._id,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(msg.createdAt),
          }))
        );
        setCurrentThreadId(threadId);
      }
    } catch (error) {
      console.error("Error loading thread messages:", error);
    }
  };

  const createNewThread = async (clearMessages: boolean = true): Promise<string | null> => {
    try {
      const response = await fetch("/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createThread" }),
      });
      if (response.ok) {
        const data = await response.json();
        const threadId = data.threadId;
        setCurrentThreadId(threadId);
        if (clearMessages) {
          setMessages([]);
          setInput("");
        }
        setIsLoading(false);
        await loadThreads(); // Refresh threads list
        return threadId;
      }
    } catch (error) {
      console.error("Error creating thread:", error);
    }
    return null;
  };

  const ensureThreadExists = async (): Promise<string | null> => {
    // If we have a current thread, use it
    if (currentThreadId) {
      return currentThreadId;
    }
    
    // If we have threads but no current thread selected, use the most recent one
    // Don't load messages here - just set the thread ID so messages continue in the same thread
    if (threads.length > 0) {
      const mostRecentThread = threads[0];
      setCurrentThreadId(mostRecentThread._id);
      return mostRecentThread._id;
    }
    
    // No threads exist, create a new one (but don't clear messages)
    return await createNewThread(false);
  };

  const saveMessage = async (role: string, content: string) => {
    const threadId = await ensureThreadExists();
    if (!threadId) {
      console.error("Failed to get or create thread");
      return;
    }
    await saveMessageToThread(threadId, role, content);
  };

  const saveMessageToThread = async (threadId: string, role: string, content: string) => {
    try {
      await fetch("/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveMessage",
          threadId,
          role,
          content,
        }),
      });
      // Refresh threads to update titles
      await loadThreads();
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat-history?threadId=${threadId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await loadThreads();
        if (currentThreadId === threadId) {
          setMessages([]);
          setCurrentThreadId(null);
        }
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
  };

  const startNewChat = async () => {
    await createNewThread(true); // Clear messages when starting new chat
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent page scroll
    if (!input.trim() || isLoading) return;

    console.log("\n🎯 === USER QUERY START ===");
    console.log("🎯 User query:", input);

    // Ensure we have a thread before proceeding
    const threadId = await ensureThreadExists();
    if (!threadId) {
      console.error("❌ Failed to get or create thread");
      return;
    }
    console.log("🎯 Thread ID:", threadId);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    console.log("🎯 Messages to send:", [...messages, userMessage].map(m => ({ role: m.role, content: m.content.substring(0, 50) })));

    // Scroll will happen automatically via useEffect when messages update

    // Save user message to database
    await saveMessageToThread(threadId, "user", userMessage.content);

    try {
      console.log("📡 Sending request to /api/chat...");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Chat API error:", response.status, errorText);
        throw new Error(`Failed to get response: ${response.status} ${errorText}`);
      }
      
      console.log("✅ Response OK, starting to read stream...");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantId = (Date.now() + 1).toString();
      let hasReceivedData = false;

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: new Date(),
        },
      ]);

      if (reader) {
        try {
          let chunkCount = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("📡 Stream done, total chunks received:", chunkCount);
              break;
            }

            chunkCount++;
            const chunk = decoder.decode(value, { stream: true });
            hasReceivedData = true;
            
            // Log chunks for debugging
            console.log(`📡 Chunk #${chunkCount} (${chunk.length} bytes):`, chunk.substring(0, 200));
            
            assistantMessage += chunk;

            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantMessage } : m
              );
              return updated;
            });

            // Throttled scroll during streaming - only scroll every 300ms to avoid too many scroll calls
            if (messagesContainerRef.current && !scrollTimeoutRef.current) {
              scrollTimeoutRef.current = setTimeout(() => {
                if (messagesContainerRef.current) {
                  const container = messagesContainerRef.current;
                  container.scrollTo({
                    top: container.scrollHeight,
                    behavior: "smooth",
                  });
                  scrollTimeoutRef.current = null;
                }
              }, 300);
            }
          }
        } catch (streamError) {
          console.error("Stream reading error:", streamError);
          throw streamError;
        }
      }

      // If no data was received, show an error
      if (!hasReceivedData && !assistantMessage) {
        console.error("❌ No data received from stream");
        console.log("🎯 === USER QUERY END (NO DATA) ===\n");
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "I'm having trouble processing your request. Please try again.",
            createdAt: new Date(),
          },
        ]);
      } else {
        console.log("✅ Final assistant message length:", assistantMessage.length);
        console.log("✅ Final assistant message preview:", assistantMessage.substring(0, 200));
        console.log("🎯 === USER QUERY END (SUCCESS) ===\n");
      }

      // Save assistant message to database
      if (assistantMessage && threadId) {
        await saveMessageToThread(threadId, "assistant", assistantMessage);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full mb-6"
    >
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
        {/* Subtle animated background gradient */}
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl animate-pulse" />
          <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-cyan-500/10 blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        {/* Minimal Header */}
        <div className="relative p-3 border-b border-border/40 flex justify-between items-center group">
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity flex-1"
          >
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center ring-1 ring-primary/10 group-hover:ring-primary/20 transition-all duration-300">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground font-display">AI Assistant</h3>
              <p className="text-[10px] text-muted-foreground">
                {currentThreadId && threads.find((t) => t._id === currentThreadId)
                  ? threads.find((t) => t._id === currentThreadId)?.title || "New Chat"
                  : "Ask about your security assessments"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isOpen && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowThreads(!showThreads);
                }}
                className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-secondary/50"
                title="Chat History"
              >
                <History className="w-3.5 h-3.5" />
              </motion.button>
            )}
            {isOpen && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  startNewChat();
                }}
                className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-secondary/50"
                title="New Chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(!isOpen)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <ChevronDown
                className={`w-4 h-4 transform transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </motion.button>
          </div>
        </div>

        {/* Chat Area */}
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative"
            >
              {/* Threads Sidebar */}
              <AnimatePresence>
                {showThreads && (
                  <motion.div
                    initial={{ x: -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 top-0 bottom-0 w-64 bg-card/95 backdrop-blur-sm border-r border-border/60 z-10 flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3 border-b border-border/40 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Chat History</h4>
                      <button
                        onClick={() => setShowThreads(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {threads.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">
                          No previous chats
                        </p>
                      ) : (
                        threads.map((thread) => (
                          <motion.div
                            key={thread._id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              loadThreadMessages(thread._id);
                              setShowThreads(false);
                            }}
                            className={`group p-2.5 rounded-lg cursor-pointer transition-colors ${
                              currentThreadId === thread._id
                                ? "bg-primary/10 border border-primary/20"
                                : "bg-secondary/30 hover:bg-secondary/50 border border-transparent"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {thread.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {new Date(thread.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Delete this chat?")) {
                                    deleteThread(thread._id);
                                  }
                                }}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100"
                                title="Delete chat"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                ref={messagesContainerRef}
                className="h-[400px] overflow-y-auto overflow-x-hidden p-4 space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                style={{ 
                  scrollBehavior: "smooth",
                  maxHeight: "400px",
                }}
                onWheel={(e) => {
                  // Prevent scroll from bubbling to parent page
                  e.stopPropagation();
                }}
                onTouchMove={(e) => {
                  // Prevent touch scroll from bubbling
                  e.stopPropagation();
                }}
              >
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-cyan-500/10 rounded-full blur-xl" />
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-sky-500/5 to-cyan-500/5 flex items-center justify-center ring-1 ring-primary/10">
                        <MessageSquare className="w-6 h-6 text-primary/40" />
                      </div>
                    </div>
                    <p className="text-xs font-medium text-center max-w-xs">Ask me anything about your security assessments or projects</p>
                  </motion.div>
                )}

                {messages.map((m, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${
                        m.role === "user"
                          ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-br-sm shadow-md shadow-sky-500/20"
                          : "bg-card/80 border border-border/60 text-foreground rounded-bl-sm shadow-sm"
                      }`}
                    >
                      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({
                              node,
                              inline,
                              className,
                              children,
                              ...props
                            }: any) =>
                              inline ? (
                                <code
                                  className="bg-background/60 px-1 py-0.5 rounded text-xs font-mono"
                                  {...props}
                                >
                                  {children}
                                </code>
                              ) : (
                                <code
                                  className="block bg-background/60 p-2.5 rounded-lg text-xs font-mono overflow-x-auto my-2"
                                  {...props}
                                >
                                  {children}
                                </code>
                              ),
                            p: ({ children }) => (
                              <p className="mb-1.5 last:mb-0 text-sm">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside mb-1.5 space-y-0.5 text-sm">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside mb-1.5 space-y-0.5 text-sm">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="mb-0.5">{children}</li>
                            ),
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                className="text-primary hover:text-primary/80 underline underline-offset-2"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {children}
                              </a>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">{children}</strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic">{children}</em>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-card/80 border border-border/60 rounded-xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                      <motion.div
                        className="w-1.5 h-1.5 bg-primary rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 bg-primary rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 bg-primary rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Minimal Input Area */}
              <form
                onSubmit={handleSubmit}
                className="relative p-3 border-t border-border/40 flex gap-2 bg-background/30"
              >
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  className="flex-1 bg-background/50 border border-border/60 rounded-lg px-3.5 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary/30 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/60"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about security assessments..."
                  disabled={isLoading}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-sky-500/20 flex items-center justify-center min-w-[36px]"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


