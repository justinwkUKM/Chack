// components/assessment-detail-content.tsx

"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import FindingsList from "./findings-list";
import ResultsList from "./results-list";
import TerminalViewer from "./terminal-viewer";
import { useSSE } from "@/hooks/use-sse";
import { useFetchReport } from "@/hooks/use-fetch-report";

interface AssessmentDetailContentProps {
  assessmentId: string;
  userId: string;
}

export default function AssessmentDetailContent({
  assessmentId,
  userId,
}: AssessmentDetailContentProps) {
  const router = useRouter();
  const assessment = useQuery(api.assessments.get, { assessmentId });
  const updateAssessmentStatus = useMutation(api.assessments.updateStatus);
  const parseReport = useMutation(api.assessments.parseReport);
  const deleteAssessment = useMutation(api.assessments.deleteAssessment);
  const addLogsBatch = useMutation(api.scanLogs.addLogsBatch);
  const persistedLogs = useQuery(api.scanLogs.list, { assessmentId });
  const scanTriggered = useRef(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const logsPersistTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingLogs = useRef<any[]>([]);

  // Setup SSE for real-time scanning
  const scanUrl = `/api/assessments/${assessmentId}/scan`;
  
  // Prepare body - userId will be extracted from session in API route
  // Only send targetUrl, gitRepoUrl, and type (NO userId)
  const requestBody = useMemo(
    () =>
      assessment && (assessment.targetUrl || assessment.gitRepoUrl)
        ? {
            targetUrl: assessment.targetUrl || "",
            gitRepoUrl: assessment.gitRepoUrl || "",
            type: assessment.type,
          }
        : undefined,
    [assessment]
  );

  // Debug: Log the request body to verify it doesn't contain userId
  if (requestBody) {
    console.log("[AssessmentDetail] Request body (should NOT contain userId):", requestBody);
    if ('userId' in requestBody) {
      console.error("[AssessmentDetail] ERROR: userId should NOT be in request body!");
    }
  }

  // Hook for fetching report from session
  const { fetchReport, isLoading: isLoadingReport, reportData } = useFetchReport({
    onSuccess: async (data) => {
      if (data.success && data.report && assessment) {
        console.log("[AssessmentDetail] Report fetched successfully, parsing...");
        try {
          await parseReport({
            assessmentId,
            report: data.report,
            userId,
          });
          await updateAssessmentStatus({
            assessmentId,
            status: "completed",
            completedAt: Date.now(),
          });
          console.log("[AssessmentDetail] Report parsed and assessment marked as completed");
        } catch (err) {
          console.error("[AssessmentDetail] Failed to parse fetched report:", err);
        }
      }
    },
    onError: (err) => {
      console.error("[AssessmentDetail] Failed to fetch report:", err);
    },
  });

  const { logs, isStreaming, finalReport, error, start, stop } = useSSE(scanUrl, {
    method: "POST",
    body: requestBody,
    onEvent: (event) => {
      // Add new logs to pending batch for persistence
      if (event.content?.parts) {
        for (const part of event.content.parts) {
          if (part.text) {
            pendingLogs.current.push({
              assessmentId,
              timestamp: event.timestamp || Date.now(),
              author: event.author || "agent",
              text: part.text,
              type: "text",
            });
          }
          if (part.functionCall) {
            pendingLogs.current.push({
              assessmentId,
              timestamp: event.timestamp || Date.now(),
              author: event.author || "agent",
              text: part.functionCall.name,
              type: "functionCall",
            });
          }
          if (part.functionResponse) {
            pendingLogs.current.push({
              assessmentId,
              timestamp: event.timestamp || Date.now(),
              author: event.author || "agent",
              text: part.functionResponse.name,
              type: "functionResponse",
            });
          }
        }
      }

      // Batch persist logs every 2 seconds
      if (logsPersistTimer.current) {
        clearTimeout(logsPersistTimer.current);
      }
      logsPersistTimer.current = setTimeout(async () => {
        if (pendingLogs.current.length > 0) {
          try {
            await addLogsBatch({ logs: pendingLogs.current });
            pendingLogs.current = [];
          } catch (err) {
            console.error("[AssessmentDetail] Failed to persist logs:", err);
          }
        }
      }, 2000);
    },
    onComplete: async (report) => {
      // Persist any remaining logs
      if (pendingLogs.current.length > 0) {
        try {
          await addLogsBatch({ logs: pendingLogs.current });
          pendingLogs.current = [];
        } catch (err) {
          console.error("[AssessmentDetail] Failed to persist final logs:", err);
        }
      }

      if (report && assessment) {
        try {
          // Parse the report and create findings/results
          await parseReport({
            assessmentId,
            report,
            userId,
          });
          // Update assessment status to completed
          await updateAssessmentStatus({
            assessmentId,
            status: "completed",
            completedAt: Date.now(),
          });
        } catch (err) {
          console.error("Failed to parse report:", err);
          await updateAssessmentStatus({
            assessmentId,
            status: "failed",
            completedAt: Date.now(),
          });
        }
      } else if (!report && assessment) {
        // If no report extracted from stream, try fetching from session
        console.log("[AssessmentDetail] No report in stream, attempting to fetch from session...");
        setIsFetchingReport(true);
        setTimeout(async () => {
          try {
            await fetchReport(assessmentId, assessment.type as "blackbox" | "whitebox");
          } finally {
            setIsFetchingReport(false);
          }
        }, 2000); // Small delay to ensure session is updated
      }
    },
    onError: async (err) => {
      console.error("SSE error:", err);
      if (assessment) {
        await updateAssessmentStatus({
          assessmentId,
          status: "failed",
          completedAt: Date.now(),
        });
      }
    },
    onStart: async (response) => {
      // Extract sessionId from response headers and save to assessment
      const sessionId = response.headers.get("X-Session-ID");
      if (sessionId && assessment) {
        console.log("[AssessmentDetail] Saving sessionId to assessment:", sessionId);
        try {
          await updateAssessmentStatus({
            assessmentId,
            status: "running",
            sessionId,
          });
        } catch (err) {
          console.error("[AssessmentDetail] Failed to save sessionId:", err);
        }
      }
    },
  });

  // Automatically start scan when assessment is running
  useEffect(() => {
    if (assessment?.status === "running" && !scanTriggered.current) {
      // Check if we have required data
      const hasTarget = assessment.type === "blackbox" 
        ? !!assessment.targetUrl 
        : !!assessment.gitRepoUrl;
      
      if (!hasTarget) {
        console.warn("[AssessmentDetail] Missing target URL or git repo URL");
        return;
      }

      // Check if request body is ready
      if (!requestBody) {
        console.warn("[AssessmentDetail] Request body not ready yet");
        return;
      }

      console.log("[AssessmentDetail] Starting scan for assessment:", assessmentId);
      console.log("[AssessmentDetail] Request body:", requestBody);
      scanTriggered.current = true;
      
      // Small delay to ensure component is ready
      const timeoutId = setTimeout(() => {
        console.log("[AssessmentDetail] Calling start()");
        start();
      }, 500);

      return () => {
        clearTimeout(timeoutId);
        stop();
      };
    }
  }, [assessment, assessmentId, requestBody, start, stop]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (logsPersistTimer.current) {
        clearTimeout(logsPersistTimer.current);
      }
      // Persist any remaining logs before unmount
      if (pendingLogs.current.length > 0) {
        addLogsBatch({ logs: pendingLogs.current }).catch(err => {
          console.error("[AssessmentDetail] Failed to persist logs on unmount:", err);
        });
      }
    };
  }, [addLogsBatch]);

  // Combine persisted logs with live logs
  const allLogs = useMemo(() => {
    const persistedLogEntries = (persistedLogs || []).map(log => ({
      id: log._id,
      timestamp: log.timestamp,
      author: log.author,
      text: log.text,
      type: log.type as "text" | "functionCall" | "functionResponse" | undefined,
    }));

    // Merge with live logs, avoiding duplicates
    const liveLogIds = new Set(logs.map(l => `${l.timestamp}-${l.text}`));
    const uniquePersistedLogs = persistedLogEntries.filter(
      log => !liveLogIds.has(`${log.timestamp}-${log.text}`)
    );

    return [...uniquePersistedLogs, ...logs].sort((a, b) => 
      (a.timestamp || 0) - (b.timestamp || 0)
    );
  }, [persistedLogs, logs]);

  if (assessment === undefined) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
        <p className="text-sm text-muted-foreground mt-4 font-display">Loading...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground font-display">Assessment not found</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-primary hover:text-primary/80 transition-colors font-display"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-300";
      case "running":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "failed":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const handleDelete = async () => {
    if (!assessment) return;
    
    setIsDeleting(true);
    try {
      await deleteAssessment({ assessmentId });
      router.push(assessment.projectId ? `/projects/${assessment.projectId}` : "/dashboard");
    } catch (error: any) {
      alert(error.message || "Failed to delete assessment");
      console.error("Delete error:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            href={assessment.projectId ? `/projects/${assessment.projectId}` : "/dashboard"}
            className="text-muted-foreground hover:text-primary transition-colors font-display flex-shrink-0"
          >
            ← Back to Project
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-display font-bold text-foreground truncate">{assessment.name}</h1>
            {assessment.description && (
              <p className="text-sm text-muted-foreground">{assessment.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize border ${getStatusColor(
              assessment.status
            )} font-display`}
          >
            {assessment.status}
          </span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
            title="Delete assessment"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-display font-bold text-foreground mb-3">
              Delete Assessment?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong className="text-foreground">{assessment.name}</strong>? 
              This will permanently delete the assessment and all its findings and results. 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Assessment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase font-display mb-2">Type</div>
          <div className="text-sm font-medium capitalize font-display text-foreground">
            {assessment.type}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase font-display mb-2">Target Type</div>
          <div className="text-sm font-medium capitalize font-display text-foreground">
            {assessment.targetType}
          </div>
        </div>
        {assessment.targetUrl && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase font-display mb-2">Target URL</div>
            <div className="text-sm font-medium truncate font-display text-foreground">
              {assessment.targetUrl}
            </div>
          </div>
        )}
        {assessment.gitRepoUrl && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase font-display mb-2">Git Repository</div>
            <div className="text-sm font-medium truncate font-display text-foreground">
              {assessment.gitRepoUrl}
            </div>
          </div>
        )}
      </div>

      {assessment.status === "running" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-500/30 bg-card p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-border border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 border-4 border-transparent border-r-cyan-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  Scan in Progress
                </h3>
                <p className="text-sm text-muted-foreground font-display">
                  Running security assessment... Real-time logs are shown below.
                </p>
            <div className="mt-3 text-xs text-muted-foreground">
              {isStreaming ? "🟢 Streaming active" : "⏸️ Waiting to start..."}
              {allLogs.length > 0 && ` | ${allLogs.length} log entries`}
              {persistedLogs && persistedLogs.length > 0 && ` (${persistedLogs.length} persisted)`}
              {isFetchingReport && " | 📥 Fetching report from session..."}
            </div>
          </div>
        </div>
      </div>
          <TerminalViewer logs={allLogs} isStreaming={isStreaming} />
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4">
              <p className="text-sm text-red-800 font-display font-semibold mb-1">
                Error occurred:
              </p>
              <p className="text-sm text-red-700 font-display">
                {error.message}
              </p>
              <button
                onClick={() => {
                  scanTriggered.current = false;
                  start();
                }}
                className="mt-2 text-xs text-red-800 underline hover:text-red-900"
              >
                Retry scan
              </button>
            </div>
          )}
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg border border-border">
            <div>Status: {isStreaming ? "🟢 Streaming" : "⏸️ Not streaming"}</div>
            <div>Live logs: {logs.length}</div>
            <div>Total logs: {allLogs.length}</div>
            {persistedLogs && persistedLogs.length > 0 && (
              <div>Persisted logs: {persistedLogs.length} (restored from database)</div>
            )}
            {finalReport && <div>✅ Report extracted ({finalReport.length} chars)</div>}
            {isFetchingReport && <div>📥 Fetching report from session...</div>}
            {reportData && reportData.success && (
              <div>✅ Report fetched from {reportData.source} ({reportData.length} chars)</div>
            )}
          </div>
        </div>
      ) : (
        <>
          {assessment.status === "completed" && (
            <div className="rounded-xl border border-green-300 bg-green-50 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-green-800 font-display font-semibold">
                  Assessment Complete
                </p>
                <p className="text-xs text-green-700 font-display mt-1">
                  Review the findings and results below, or fetch the full report.
                </p>
              </div>
              <button
                onClick={async () => {
                  setIsFetchingReport(true);
                  try {
                    await fetchReport(assessmentId, assessment.type as "blackbox" | "whitebox");
                  } finally {
                    setIsFetchingReport(false);
                  }
                }}
                disabled={isLoadingReport || isFetchingReport}
                className="px-4 py-2 bg-green-600 text-white text-sm font-display rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingReport || isFetchingReport ? "Fetching..." : "Fetch Report"}
              </button>
            </div>
          )}
          <FindingsList assessmentId={assessmentId} userId={userId} />
          <ResultsList assessmentId={assessmentId} userId={userId} />
        </>
      )}
    </div>
  );
}
