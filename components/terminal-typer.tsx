"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const TERMINAL_LINES = [
  { text: "Initializing CHACK autonomous agent...", delay: 500 },
  { text: "Connecting to target network...", delay: 800 },
  { text: "[+] Enumerating subdomains...", delay: 1200 },
  { text: "[+] Map surface: 14 endpoints found", delay: 600 },
  { text: "[*] Probing auth vectors...", delay: 1500 },
  { text: "(!) VULNERABILITY DETECTED: IDOR on /api/users", color: "text-red-400", delay: 1000 },
  { text: "(!) VULNERABILITY DETECTED: Missing headers", color: "text-yellow-400", delay: 800 },
  { text: "[*] Validating findings with safe payloads...", delay: 1400 },
  { text: "Generating fix suggestions...", delay: 1000 },
  { text: "Report ready. 2 High, 1 Medium severity.", color: "text-green-400", delay: 2000 },
];

export function TerminalTyper({ className }: { className?: string }) {
  const [lines, setLines] = useState<Array<{ text: string; color?: string; timestamp?: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [currentTimestamp, setCurrentTimestamp] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Only set timestamp on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const updateTimestamp = () => {
      setCurrentTimestamp(new Date().toLocaleTimeString([], { hour12: false }));
    };
    updateTimestamp();
    const interval = setInterval(updateTimestamp, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentIndex >= TERMINAL_LINES.length) {
      // Reset after a long pause
      const timeout = setTimeout(() => {
        setLines([]);
        setCurrentIndex(0);
        setCurrentText("");
      }, 5000);
      return () => clearTimeout(timeout);
    }

    const targetLine = TERMINAL_LINES[currentIndex];
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      if (charIndex <= targetLine.text.length) {
        setCurrentText(targetLine.text.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          const timestamp = new Date().toLocaleTimeString([], { hour12: false });
          setLines((prev) => [...prev, { ...targetLine, timestamp }]);
          setCurrentText("");
          setCurrentIndex((prev) => prev + 1);
        }, targetLine.delay / 4); // Brief pause before committing the line
      }
    }, 30); // Typing speed

    return () => clearInterval(typeInterval);
  }, [currentIndex]);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, currentText]);

  return (
    <div className={cn(
      "font-mono text-xs sm:text-sm bg-black/90 rounded-xl border border-primary/20 p-4 shadow-2xl shadow-primary/10 w-full max-w-lg mx-auto text-left h-[300px] flex flex-col overflow-hidden backdrop-blur-md relative group",
      className
    )}>
      {/* Scan line overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-[10px] w-full animate-scan pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground/70 font-mono">agent@chack-security:~</span>
      </div>

      {/* Terminal Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide pb-2">
        {lines.map((line, i) => (
          <div key={i} className={cn("break-words", line.color || "text-sky-400/90")}>
            {mounted && line.timestamp && (
              <span className="opacity-50 mr-2 text-[10px] align-middle">{line.timestamp}</span>
            )}
            {line.text}
          </div>
        ))}
        <div className="text-sky-400/90 break-words">
          {mounted && currentTimestamp && (
            <span className="opacity-50 mr-2 text-[10px] align-middle">{currentTimestamp}</span>
          )}
          {currentText}
          <span className="inline-block w-1.5 h-3.5 bg-sky-400/90 ml-1 animate-pulse align-middle" />
        </div>
      </div>
    </div>
  );
}

