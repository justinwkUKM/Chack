"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Loader2, ShieldCheck, Sparkles, Target, Wand2 } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const quickPrompts = [
  "Map attack paths for our public web app",
  "Draft a detection for suspicious kubectl exec",
  "Give me hardening steps for Azure AKS",
  "Simulate a phishing runbook with mitigations",
];

const gradientAccent =
  "bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-emerald-500/15 border border-white/10 shadow-lg shadow-sky-500/10";

export function CyberAssistantPanel({ orgName }: { orgName?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "I’m your AI cyber co-pilot. Ask me to probe attack surface, sketch detections, or validate fixes. I’ll keep the focus on safe, actionable guidance.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const headerSubtitle = useMemo(() => {
    if (!orgName) return "Security intelligence that blends red & blue teaming.";
    return `Security intelligence tuned for ${orgName}.`;
  }, [orgName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    const assistantId = crypto.randomUUID ? crypto.randomUUID() : `assistant-${Date.now()}`;

    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/cyber-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || "Unable to reach the cyber assistant.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, content: assistantContent } : message
          )
        );
      }
    } catch (err: any) {
      console.error("Cyber assistant error", err);
      setError(err?.message ?? "Something went wrong. Try again.");
      setMessages((prev) => prev.filter((message) => message.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        id: "intro",
        role: "assistant",
        content:
          "I’m your AI cyber co-pilot. Ask me to probe attack surface, sketch detections, or validate fixes. I’ll keep the focus on safe, actionable guidance.",
      },
    ]);
    setError(null);
  };

  return (
    <section className="space-y-4">
      <div
        className={`relative overflow-hidden rounded-2xl ${gradientAccent} px-6 py-5 backdrop-blur-sm`}
      >
        <div className="absolute inset-0 opacity-80">
          <div className="absolute -left-10 -top-16 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute -right-16 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-sky-800 shadow-sm ring-1 ring-white/60 dark:bg-white/10 dark:text-sky-100 dark:ring-white/20">
              <Sparkles className="h-3.5 w-3.5" />
              Cyber Assistant • Streaming
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                AI Security Copilot
              </div>
              <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <BadgePill icon={<Target className="h-3.5 w-3.5" />} label="Red + Blue playbooks" />
            <BadgePill icon={<Wand2 className="h-3.5 w-3.5" />} label="Live Gemini stream" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px] lg:gap-6 lg:p-6">
          <div className="flex flex-col">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto rounded-xl bg-muted/30 p-4 ring-1 ring-border max-h-[420px]"
            >
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} role={message.role} content={message.content} />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Crafting response…
                  </div>
                )}
              </div>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              <div className="relative">
                <textarea
                  rows={3}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask for attack paths, detections, or mitigations…"
                  className="w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm shadow-sm outline-none ring-offset-background transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800/60"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bot className="h-4 w-4" />
                  Send
                </button>
              </div>
              {error && (
                <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
                  <span>{error}</span>
                  <button className="underline" onClick={resetConversation} type="button">
                    Reset chat
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold text-foreground">Jumpstart prompts</h3>
            <div className="space-y-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className="w-full rounded-lg border border-transparent bg-white/50 px-3 py-2 text-left text-sm text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white/80 hover:shadow-lg dark:bg-white/10 dark:hover:border-sky-700/70"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="rounded-lg bg-card/70 px-3 py-2 text-xs text-muted-foreground">
              Responses stream live from Google Gemini with CHACK guardrails. Avoid pasting secrets; keep chats focused on
              education and defense.
            </div>
            <button
              type="button"
              onClick={resetConversation}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:border-sky-300 hover:text-sky-700 dark:hover:border-sky-700 dark:hover:text-sky-200"
            >
              <Wand2 className="h-4 w-4" />
              New thread
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ role, content }: { role: ChatMessage["role"]; content: string }) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={`flex gap-3 ${isAssistant ? "items-start" : "items-center justify-end"}`}
    >
      {isAssistant && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/80 to-indigo-500/80 text-white shadow-md">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-full rounded-2xl px-4 py-3 text-sm shadow-sm transition ${
          isAssistant
            ? "bg-white/70 text-foreground ring-1 ring-border backdrop-blur-sm dark:bg-white/10"
            : "bg-gradient-to-r from-sky-500 to-indigo-500 text-white"
        }`}
      >
        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2 prose-li:my-1 dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
      {!isAssistant && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-200">
          <ShieldCheck className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function BadgePill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-[11px] font-semibold text-sky-800 shadow-sm ring-1 ring-white/60 transition hover:-translate-y-0.5 dark:bg-white/10 dark:text-sky-100 dark:ring-white/20">
      {icon}
      {label}
    </div>
  );
}
