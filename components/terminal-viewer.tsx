// components/terminal-viewer.tsx

"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LogEntry {
  id: string;
  timestamp?: number;
  author: string;
  text: string;
  type?: "text" | "functionCall" | "functionResponse" | "notification" | "event";
  raw?: any;
}

interface TerminalViewerProps {
  logs: LogEntry[];
  isStreaming?: boolean;
}

export default function TerminalViewer({ logs, isStreaming = false }: TerminalViewerProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll behavior:
  // - If streaming: scroll to bottom (newest logs)
  // - If not streaming: scroll to top (for completed assessments showing newest first)
  useEffect(() => {
    if (terminalRef.current) {
      if (isStreaming) {
        // Scroll to bottom for live streaming
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      } else {
        // Scroll to top for completed assessments (newest first)
        terminalRef.current.scrollTop = 0;
      }
    }
  }, [logs, isStreaming]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", { hour12: false });
  };

  // Check if text contains markdown syntax
  const containsMarkdown = (text: string): boolean => {
    const markdownPatterns = [
      /#{1,6}\s/,                    // Headers
      /\*\*.*?\*\*/,                 // Bold
      /\*.*?\*/,                      // Italic
      /`.*?`/,                        // Inline code
      /```[\s\S]*?```/,               // Code blocks
      /\[.*?\]\(.*?\)/,              // Links
      /^\s*[-*+]\s/,                  // Unordered lists
      /^\s*\d+\.\s/,                  // Ordered lists
      /^>\s/,                         // Blockquotes
      /\|.*?\|/,                      // Tables
    ];
    return markdownPatterns.some(pattern => pattern.test(text));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-900 overflow-hidden">
      {/* Terminal Header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Streaming...
            </span>
          ) : (
            "Terminal"
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="p-4 h-96 overflow-y-auto font-mono text-sm"
        style={{
          backgroundColor: "#1a1a1a",
          color: "#e0e0e0",
        }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">
            <span className="text-green-400">$</span> Waiting for logs...
          </div>
        ) : (
          logs.map((log) => {
            const hasMarkdown = !isStreaming && containsMarkdown(log.text);
            const logContent = log.type === "functionCall" ? (
              <span className="text-yellow-400 whitespace-pre-wrap break-words">
                🔧 Calling function: {log.text}
              </span>
            ) : log.type === "functionResponse" ? (
              <span className="text-blue-400 whitespace-pre-wrap break-words">
                ✓ Function response: {log.text}
              </span>
            ) : log.type === "notification" ? (
              <span className="text-purple-400 whitespace-pre-wrap break-words">
                📢 {log.text}
              </span>
            ) : log.type === "event" ? (
              <span className="text-cyan-400 whitespace-pre-wrap break-words">
                ⚡ {log.text}
              </span>
            ) : hasMarkdown ? (
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:text-gray-200 prose-headings:font-bold
                prose-h1:text-lg prose-h1:mb-2 prose-h1:mt-2
                prose-h2:text-base prose-h2:mb-2 prose-h2:mt-3
                prose-h3:text-sm prose-h3:mb-1 prose-h3:mt-2
                prose-p:text-gray-300 prose-p:my-1 prose-p:leading-relaxed
                prose-ul:text-gray-300 prose-ul:my-1 prose-ul:pl-4
                prose-ol:text-gray-300 prose-ol:my-1 prose-ol:pl-4
                prose-li:text-gray-300 prose-li:my-0.5
                prose-code:text-cyan-400 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                prose-pre:text-gray-300 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded prose-pre:p-2 prose-pre:my-2 prose-pre:overflow-x-auto
                prose-strong:text-gray-200 prose-strong:font-semibold
                prose-a:text-sky-400 prose-a:underline prose-a:hover:text-sky-300
                prose-blockquote:text-gray-400 prose-blockquote:border-l-4 prose-blockquote:border-gray-600 prose-blockquote:pl-3 prose-blockquote:italic
                prose-table:text-gray-300 prose-table:my-2
                prose-th:text-gray-200 prose-th:border prose-th:border-gray-700 prose-th:px-2 prose-th:py-1
                prose-td:text-gray-300 prose-td:border prose-td:border-gray-700 prose-td:px-2 prose-td:py-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {log.text}
                </ReactMarkdown>
              </div>
            ) : (
              <span className="whitespace-pre-wrap break-words text-gray-300">{log.text}</span>
            );

            return (
              <div key={log.id} className={`mb-2 ${hasMarkdown ? 'markdown-log' : ''}`}>
                {log.timestamp && (
                  <span className="text-cyan-400">[{formatTimestamp(log.timestamp)}]</span>
                )}{" "}
                <span className="text-green-400">[{log.author}]</span>
                {": "}
                <span className="text-gray-300">
                  {logContent}
                </span>
              </div>
            );
          })
        )}
        {isStreaming && (
          <div className="text-gray-500 animate-pulse">
            <span className="text-green-400">$</span> Processing...
          </div>
        )}
      </div>
    </div>
  );
}

