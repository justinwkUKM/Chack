// hooks/use-sse-reconnect.ts

import { useEffect, useRef, useState, useCallback } from "react";

interface SSEEvent {
  content?: {
    parts?: Array<{
      text?: string;
      functionCall?: {
        name: string;
        args?: any;
      };
      functionResponse?: {
        name: string;
        response?: any;
      };
    }>;
  };
  author?: string;
  timestamp?: number;
  type?: string;
  role?: string;
  id?: string; // Event ID for resumption
}

interface LogEntry {
  id: string;
  timestamp?: number;
  author: string;
  text: string;
  type?: "text" | "functionCall" | "functionResponse" | "notification" | "event";
  raw?: any;
  eventId?: string; // Track event ID for deduplication
}

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "reconnecting";

interface UseSSEOptions {
  onEvent?: (event: SSEEvent) => void;
  onComplete?: (report?: string) => void;
  onError?: (error: Error) => void;
  onStart?: (response: Response) => void;
  onStreamEnd?: () => void;
  method?: "GET" | "POST";
  body?: any;
  maxRetries?: number; // Max reconnection attempts (default: 10)
  maxBackoffMs?: number; // Max backoff delay (default: 30000 = 30s)
  healthCheckIntervalMs?: number; // Health check interval (default: 60000 = 60s)
}

export function useSSEReconnect(url: string, options: UseSSEOptions = {}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [reconnectDelay, setReconnectDelay] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const logIdCounter = useRef(0);
  const optionsRef = useRef(options);
  const lastEventIdRef = useRef<string | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualStopRef = useRef(false);
  const localStorageKey = useRef(`sse_logs_${url.split('/').pop()}`);
  
  const maxRetries = options.maxRetries ?? 10;
  const maxBackoffMs = options.maxBackoffMs ?? 30000; // 30 seconds
  const healthCheckIntervalMs = options.healthCheckIntervalMs ?? 60000; // 60 seconds

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Generate unique log ID
  const generateLogId = useCallback(() => {
    return `log-${++logIdCounter.current}-${Date.now()}`;
  }, []);

  // Calculate exponential backoff delay
  const calculateBackoff = useCallback((attempt: number): number => {
    const delay = Math.min(1000 * Math.pow(2, attempt), maxBackoffMs);
    return delay;
  }, [maxBackoffMs]);

  // Save logs to localStorage for backup
  const saveLogsToStorage = useCallback((logsToSave: LogEntry[]) => {
    try {
      const data = {
        logs: logsToSave,
        lastEventId: lastEventIdRef.current,
        timestamp: Date.now(),
      };
      localStorage.setItem(localStorageKey.current, JSON.stringify(data));
    } catch (err) {
      console.error("[useSSE] Failed to save logs to localStorage:", err);
    }
  }, []);

  // Load logs from localStorage
  const loadLogsFromStorage = useCallback((): LogEntry[] => {
    try {
      const stored = localStorage.getItem(localStorageKey.current);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.lastEventId) {
          lastEventIdRef.current = data.lastEventId;
        }
        return data.logs || [];
      }
    } catch (err) {
      console.error("[useSSE] Failed to load logs from localStorage:", err);
    }
    return [];
  }, []);

  // Clear localStorage
  const clearLogsFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(localStorageKey.current);
    } catch (err) {
      console.error("[useSSE] Failed to clear localStorage:", err);
    }
  }, []);

  // Deduplicate logs by eventId or timestamp+content
  const deduplicateLogs = useCallback((logsArray: LogEntry[]): LogEntry[] => {
    const seen = new Set<string>();
    const deduplicated: LogEntry[] = [];

    for (const log of logsArray) {
      // Create unique key for deduplication
      const key = log.eventId || `${log.timestamp}-${log.author}-${log.text.substring(0, 100)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(log);
      }
    }

    return deduplicated;
  }, []);

  // Add log with deduplication
  const addLog = useCallback((entry: Omit<LogEntry, "id">) => {
    const id = generateLogId();
    const newLog = { ...entry, id };
    
    setLogs((prev) => {
      const updated = [...prev, newLog];
      const deduplicated = deduplicateLogs(updated);
      
      // Save to localStorage for backup
      saveLogsToStorage(deduplicated);
      
      return deduplicated;
    });

    // Update last event time for health monitoring
    lastEventTimeRef.current = Date.now();
  }, [generateLogId, deduplicateLogs, saveLogsToStorage]);

  // Extract report from text (kept for compatibility)
  const extractReport = useCallback((text: string, reportType: "blackbox" | "whitebox" = "blackbox"): string | null => {
    const pattern =
      reportType === "whitebox"
        ? /===WHITEBOX_REPORT_START===(.*?)===WHITEBOX_REPORT_END===/s
        : /===BLACKBOX_REPORT_START===(.*?)===BLACKBOX_REPORT_END===/s;

    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }, []);

  // Process SSE stream
  const processStream = useCallback(async (isReconnect: boolean = false) => {
    const currentOptions = optionsRef.current;
    
    try {
      console.log(`[useSSE] ${isReconnect ? 'Reconnecting' : 'Starting'} SSE stream:`, url);
      
      setConnectionStatus(isReconnect ? "reconnecting" : "connecting");

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Build fetch options
      const fetchOptions: RequestInit = {
        method: currentOptions.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
      };

      // Add Last-Event-ID header for resumption
      if (isReconnect && lastEventIdRef.current) {
        console.log(`[useSSE] Resuming from event ID: ${lastEventIdRef.current}`);
        fetchOptions.headers = {
          ...fetchOptions.headers,
          "Last-Event-ID": lastEventIdRef.current,
        };
      }

      // Add body if provided
      if (currentOptions.body && Object.keys(currentOptions.body).length > 0) {
        fetchOptions.body = JSON.stringify(currentOptions.body);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Successfully connected
      setConnectionStatus("connected");
      setError(null);
      setRetryCount(0); // Reset retry counter on successful connection
      
      // Call onStart callback
      if (currentOptions.onStart && !isReconnect) {
        currentOptions.onStart(response);
      }

      console.log(`[useSSE] ✅ Connected successfully, reading stream...`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventCount = 0;
      let allStreamText = ""; // Collect all text to extract report at end

      while (true) {
        let readResult;
        try {
          readResult = await reader.read();
        } catch (readError) {
          // Handle abort errors gracefully (expected during cleanup)
          if (readError instanceof Error && (readError.name === "AbortError" || readError.message.includes("aborted"))) {
            console.log(`[useSSE] Stream aborted (expected during cleanup)`);
            setConnectionStatus("disconnected");
            return; // Exit gracefully
          }
          // Re-throw other errors
          throw readError;
        }

        const { done, value } = readResult;

        if (done) {
          console.log(`[useSSE] Stream ended naturally. Total events: ${eventCount}`);
          setConnectionStatus("disconnected");
          
          // Extract report from all collected text
          const reportType = currentOptions.body?.type || "blackbox";
          const extractedReport = extractReport(allStreamText, reportType);
          
          if (extractedReport) {
            console.log(`[useSSE] ✅ Report extracted from stream! (${extractedReport.length} chars)`);
            setFinalReport(extractedReport);
          } else {
            console.log(`[useSSE] No report markers found in stream text`);
          }
          
          if (currentOptions.onStreamEnd) {
            currentOptions.onStreamEnd();
          }
          
          if (currentOptions.onComplete) {
            currentOptions.onComplete(extractedReport || undefined);
          }
          
          // Clear localStorage on successful completion
          clearLogsFromStorage();
          
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process SSE events
        while (buffer.includes("\n\n") || buffer.includes("\r\n\r\n")) {
          const delimiter = buffer.includes("\n\n") ? "\n\n" : "\r\n\r\n";
          const eventEnd = buffer.indexOf(delimiter);
          
          if (eventEnd === -1) break;

          const eventText = buffer.slice(0, eventEnd);
          buffer = buffer.slice(eventEnd + delimiter.length);

          if (!eventText.trim()) continue;

          // Parse SSE event (handle both "data:" format and raw JSON)
          let dataLine = "";
          let eventId: string | undefined;
          
          for (const line of eventText.split("\n")) {
            if (line.startsWith("data: ")) {
              dataLine = line.slice(6);
            } else if (line.startsWith("id: ")) {
              eventId = line.slice(4);
            }
          }

          if (!dataLine && eventText.trim()) {
            dataLine = eventText.trim();
          }

          if (dataLine) {
            try {
              eventCount++;
              const data: SSEEvent = JSON.parse(dataLine);

              // Store event ID if provided
              if (eventId || data.id) {
                lastEventIdRef.current = eventId || data.id || null;
              }

              // Call custom onEvent handler
              if (currentOptions.onEvent) {
                currentOptions.onEvent(data);
              }

              const content = data.content;
              const parts = content?.parts || [];
              const author = data.author || data.role || "unknown";
              const timestamp = data.timestamp;

              // Handle events without parts (notifications)
              if (parts.length === 0 && (data.type || data.role)) {
                addLog({
                  author,
                  text: JSON.stringify(data),
                  timestamp,
                  type: "notification",
                  raw: data,
                  eventId: lastEventIdRef.current || undefined,
                });
              }

              for (const part of parts) {
                // Handle text content
                if (part.text) {
                  const text = part.text;
                  
                  // Collect all text for report extraction
                  allStreamText += text + "\n";
                  
                  addLog({
                    author,
                    text,
                    timestamp,
                    type: "text",
                    raw: part,
                    eventId: lastEventIdRef.current || undefined,
                  });
                  
                  // Check for report markers in real-time (optional - can also check at end)
                  const reportType = currentOptions.body?.type || "blackbox";
                  const report = extractReport(allStreamText, reportType);
                  if (report) {
                    console.log(`[useSSE] Report detected during stream!`);
                    setFinalReport(report);
                  }
                }

                // Handle function calls
                if (part.functionCall) {
                  const funcName = part.functionCall.name;
                  const funcArgs = part.functionCall.args 
                    ? `\n  Args: ${JSON.stringify(part.functionCall.args, null, 2)}` 
                    : "";
                  addLog({
                    author,
                    text: `${funcName}${funcArgs}`,
                    timestamp,
                    type: "functionCall",
                    raw: part.functionCall,
                    eventId: lastEventIdRef.current || undefined,
                  });
                }

                // Handle function responses
                if (part.functionResponse) {
                  const funcName = part.functionResponse.name;
                  const funcResponse = part.functionResponse.response
                    ? `\n  Response: ${JSON.stringify(part.functionResponse.response, null, 2)}`
                    : "";
                  addLog({
                    author,
                    text: `${funcName}${funcResponse}`,
                    timestamp,
                    type: "functionResponse",
                    raw: part.functionResponse,
                    eventId: lastEventIdRef.current || undefined,
                  });
                }
              }
            } catch (err) {
              console.error("[useSSE] Failed to parse event:", err);
            }
          }
        }
      }
    } catch (err) {
      // Handle abort errors gracefully (expected during cleanup)
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
        console.log("[useSSE] Stream aborted (expected during cleanup)");
        
        // If manually stopped, don't reconnect
        if (isManualStopRef.current) {
          setConnectionStatus("disconnected");
          return;
        }
        // If aborted during cleanup, just exit silently
        return;
      }
      
      console.error("[useSSE] Stream error:", err);
      const error = err instanceof Error ? err : new Error("SSE connection error");
      setError(error);
      setConnectionStatus("disconnected");
      
      if (currentOptions.onError) {
        currentOptions.onError(error);
      }

      // Attempt to reconnect if not manually stopped
      if (!isManualStopRef.current && retryCount < maxRetries) {
        const delay = calculateBackoff(retryCount);
        setReconnectDelay(delay);
        setRetryCount(prev => prev + 1);
        
        console.log(`[useSSE] Will reconnect in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        reconnectTimerRef.current = setTimeout(() => {
          console.log(`[useSSE] Reconnecting now...`);
          processStream(true); // Reconnect
        }, delay);
      } else if (retryCount >= maxRetries) {
        console.error(`[useSSE] Max retries (${maxRetries}) reached. Connection failed.`);
        setConnectionStatus("disconnected");
      }
    }
  }, [url, addLog, calculateBackoff, retryCount, maxRetries, clearLogsFromStorage]);

  // Start connection
  const start = useCallback(() => {
    console.log("[useSSE] Start called");
    
    // Stop any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // Reset state
    isManualStopRef.current = false;
    setError(null);
    setRetryCount(0);
    setReconnectDelay(0);
    lastEventTimeRef.current = Date.now();
    
    // Try to load logs from localStorage (in case of page refresh)
    const storedLogs = loadLogsFromStorage();
    if (storedLogs.length > 0) {
      console.log(`[useSSE] Restored ${storedLogs.length} logs from localStorage`);
      setLogs(storedLogs);
    } else {
      setLogs([]);
    }
    
    setFinalReport(null);

    // Start processing
    processStream(false);
    
    // Start health check monitoring
    startHealthCheck();
  }, [processStream, loadLogsFromStorage]);

  // Stop connection (manual)
  const stop = useCallback(() => {
    console.log("[useSSE] Stop called (manual)");
    isManualStopRef.current = true;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current);
      healthCheckTimerRef.current = null;
    }
    
    setConnectionStatus("disconnected");
  }, []);

  // Manual reconnect (for user button)
  const reconnect = useCallback(() => {
    console.log("[useSSE] Manual reconnect triggered");
    setRetryCount(0);
    setReconnectDelay(0);
    isManualStopRef.current = false;
    processStream(true);
  }, [processStream]);

  // Health check - detect stale connections
  const startHealthCheck = useCallback(() => {
    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current);
    }

    healthCheckTimerRef.current = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
      
      // If no events for more than healthCheckIntervalMs and we're "connected", something might be wrong
      if (timeSinceLastEvent > healthCheckIntervalMs && connectionStatus === "connected") {
        console.warn(`[useSSE] No events received for ${timeSinceLastEvent}ms. Connection may be stale.`);
        // Optionally trigger reconnection
        // For now, just log it. User can manually reconnect if needed.
      }
    }, healthCheckIntervalMs);
  }, [healthCheckIntervalMs, connectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Silently abort any ongoing requests during cleanup
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      } catch (err) {
        // Ignore abort errors during cleanup - they're expected
        if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
          // Expected during cleanup, ignore
        } else {
          console.warn("[useSSE] Error during cleanup:", err);
        }
      }
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
      }
    };
  }, []);

  return {
    logs,
    connectionStatus,
    isStreaming: connectionStatus === "connected" || connectionStatus === "reconnecting",
    finalReport,
    error,
    retryCount,
    reconnectDelay,
    maxRetries,
    start,
    stop,
    reconnect,
  };
}

