// hooks/use-sse.ts

import { useEffect, useRef, useState, useCallback } from "react";

interface SSEEvent {
  content?: {
    parts?: Array<{
      text?: string;
      functionCall?: {
        name: string;
      };
      functionResponse?: {
        name: string;
      };
    }>;
  };
  author?: string;
  timestamp?: number;
}

interface LogEntry {
  id: string;
  timestamp?: number;
  author: string;
  text: string;
  type?: "text" | "functionCall" | "functionResponse";
}

interface UseSSEOptions {
  onEvent?: (event: SSEEvent) => void;
  onComplete?: (report?: string) => void;
  onError?: (error: Error) => void;
  onStart?: (response: Response) => void; // Add onStart callback
  onStreamEnd?: () => void; // Called when stream ends (complete or cancelled)
  method?: "GET" | "POST";
  body?: any;
}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const logIdCounter = useRef(0);
  const optionsRef = useRef(options);
  
  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const extractReport = useCallback((text: string, reportType: "blackbox" | "whitebox" = "blackbox"): string | null => {
    const pattern =
      reportType === "whitebox"
        ? /===WHITEBOX_REPORT_START===(.*?)===WHITEBOX_REPORT_END===/s
        : /===BLACKBOX_REPORT_START===(.*?)===BLACKBOX_REPORT_END===/s;

    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }, []);

  const addLog = useCallback((entry: Omit<LogEntry, "id">) => {
    const id = `log-${++logIdCounter.current}`;
    setLogs((prev) => [...prev, { ...entry, id }]);
  }, []);

  const start = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Get latest options from ref
    const currentOptions = optionsRef.current;
    
    console.log("[useSSE] Starting SSE stream:", url);
    console.log("[useSSE] Current options:", currentOptions);
    setIsStreaming(true);
    setError(null);
    setLogs([]);
    setFinalReport(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let buffer = "";
    let hasReport = false;

    const processStream = async () => {
      try {
        console.log("[useSSE] Making fetch request to:", url);
        console.log("[useSSE] Request body:", currentOptions.body);
        
        const fetchOptions: RequestInit = {
          method: currentOptions.method || "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: abortController.signal,
        };

        // Only add body if it exists and is not empty
        if (currentOptions.body && Object.keys(currentOptions.body).length > 0) {
          fetchOptions.body = JSON.stringify(currentOptions.body);
          console.log("[useSSE] Sending body:", JSON.stringify(currentOptions.body, null, 2));
        } else {
          console.warn("[useSSE] No body provided or body is empty!");
        }

        const response = await fetch(url, fetchOptions);

        console.log("[useSSE] Response status:", response.status, response.statusText);

        if (!response.ok) {
          let errorText = "";
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = "Could not read error response";
          }
          console.log("[useSSE] HTTP error:", errorText);
          throw new Error(`HTTP error! status: ${response.status}${errorText ? ` - ${errorText}` : ""}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Call onStart callback with response (to extract headers like sessionId)
        if (currentOptions.onStart) {
          try {
            currentOptions.onStart(response);
          } catch (e) {
            console.log("[useSSE] Error in onStart callback:", e);
            // Don't throw - continue with stream
          }
        }

        console.log("[useSSE] Starting to read stream...");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let eventCount = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log(`[useSSE] Stream ended. Total events: ${eventCount}`);
            setIsStreaming(false);
            
            // Call onStreamEnd callback
            if (currentOptions.onStreamEnd) {
              currentOptions.onStreamEnd();
            }
            
            if (currentOptions.onComplete && !hasReport) {
              currentOptions.onComplete();
            }
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process SSE events (format: "data: ...\n\n" or "event: ...\ndata: ...\n\n")
          while (buffer.includes("\n\n") || buffer.includes("\r\n\r\n")) {
            const delimiter = buffer.includes("\n\n") ? "\n\n" : "\r\n\r\n";
            const eventEnd = buffer.indexOf(delimiter);
            
            if (eventEnd === -1) break;

            const eventText = buffer.slice(0, eventEnd);
            buffer = buffer.slice(eventEnd + delimiter.length);

            if (!eventText.trim()) continue;

            // Extract data line from SSE event
            let dataLine = "";
            for (const line of eventText.split("\n")) {
              if (line.startsWith("data: ")) {
                dataLine = line.slice(6);
                break;
              }
            }

            // If no "data:" prefix, try to parse the whole line as JSON
            if (!dataLine && eventText.trim()) {
              dataLine = eventText.trim();
            }

            if (dataLine) {
              try {
                eventCount++;
                const data: SSEEvent = JSON.parse(dataLine);

                // Log first few events for debugging
                if (eventCount <= 3) {
                  console.log(`[useSSE] Event ${eventCount}:`, {
                    author: data.author,
                    hasContent: !!data.content,
                    partsCount: data.content?.parts?.length || 0,
                  });
                }

                // Call custom onEvent handler
                if (currentOptions.onEvent) {
                  currentOptions.onEvent(data);
                }

                const content = data.content;
                const parts = content?.parts || [];
                const author = data.author || "unknown";
                const timestamp = data.timestamp;

                for (const part of parts) {
                  // Handle text content
                  if (part.text) {
                    const text = part.text;
                    addLog({
                      author,
                      text,
                      timestamp,
                      type: "text",
                    });

                    // Check for final report
                    const reportType = currentOptions.body?.type || "blackbox";
                    const report = extractReport(text, reportType);
                    if (report) {
                      console.log("[useSSE] Final report detected!");
                      hasReport = true;
                      setFinalReport(report);
                      setIsStreaming(false);
                      if (currentOptions.onComplete) {
                        currentOptions.onComplete(report);
                      }
                      abortController.abort();
                      return;
                    }
                  }

                  // Handle function calls
                  if (part.functionCall) {
                    addLog({
                      author,
                      text: part.functionCall.name,
                      timestamp,
                      type: "functionCall",
                    });
                  }

                  // Handle function responses
                  if (part.functionResponse) {
                    addLog({
                      author,
                      text: part.functionResponse.name,
                      timestamp,
                      type: "functionResponse",
                    });
                  }
                }
              } catch (err) {
                console.error("[useSSE] Failed to parse SSE event:", err, "Data:", dataLine.substring(0, 200));
                // Continue processing other events
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[useSSE] Stream aborted (expected)");
          return;
        }
        console.error("[useSSE] Stream error:", err);
        const error = err instanceof Error ? err : new Error("SSE connection error");
        setError(error);
        setIsStreaming(false);
        if (currentOptions.onError) {
          currentOptions.onError(error);
        }
      }
    };

    processStream();
  }, [url, addLog, extractReport]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    logs,
    isStreaming,
    finalReport,
    error,
    start,
    stop,
  };
}

