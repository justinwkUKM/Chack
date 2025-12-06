// components/terminal-viewer.tsx

"use client";

import { useEffect, useRef } from "react";

interface LogEntry {
  id: string;
  timestamp?: number;
  author: string;
  text: string;
  type?: "text" | "functionCall" | "functionResponse";
}

interface TerminalViewerProps {
  logs: LogEntry[];
  isStreaming?: boolean;
}

export default function TerminalViewer({ logs, isStreaming = false }: TerminalViewerProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", { hour12: false });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
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
          logs.map((log) => (
            <div key={log.id} className="mb-2">
              {log.timestamp && (
                <span className="text-cyan-400">[{formatTimestamp(log.timestamp)}]</span>
              )}{" "}
              <span className="text-green-400">[{log.author}]</span>
              {": "}
              <span className="text-gray-300">
                {log.type === "functionCall" ? (
                  <span className="text-yellow-400">
                    Calling function: {truncateText(log.text)}
                  </span>
                ) : log.type === "functionResponse" ? (
                  <span className="text-blue-400">
                    Function response: {truncateText(log.text)}
                  </span>
                ) : (
                  truncateText(log.text, 500)
                )}
              </span>
            </div>
          ))
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

