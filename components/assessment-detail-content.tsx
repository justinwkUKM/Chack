// components/assessment-detail-content.tsx

"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import TerminalViewer from "./terminal-viewer";
import ReportViewer from "./report-viewer";
import ConnectionStatus from "./connection-status";
import { useSSEReconnect } from "@/hooks/use-sse-reconnect";
import { useFetchReport } from "@/hooks/use-fetch-report";
import { useToast } from "./toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AssessmentDetailContentProps {
  assessmentId: string;
  userId: string;
}

export default function AssessmentDetailContent({
  assessmentId,
  userId,
}: AssessmentDetailContentProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError, ToastComponent } = useToast();
  const assessmentData = useQuery(api.assessments.get, { assessmentId });
  
  // Type guard: ensure we have an assessment (not a user or other type)
  const assessment = assessmentData && 'status' in assessmentData ? assessmentData : null;
  
  const updateAssessmentStatus = useMutation(api.assessments.updateStatus);
  const parseReport = useMutation(api.assessments.parseReport);
  const deleteAssessment = useMutation(api.assessments.deleteAssessment);
  const addLogsBatch = useMutation(api.scanLogs.addLogsBatch);
  const saveReport = useMutation(api.results.saveReport);
  const persistedLogs = useQuery(api.scanLogs.list, { assessmentId });
  const savedReport = useQuery(api.results.list, { assessmentId, type: "report" });
  const scanTriggered = useRef(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [staticReport, setStaticReport] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const logsPersistTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingLogs = useRef<any[]>([]);

  // Load static report content
  useEffect(() => {
    // Fetch the static REPORT.md file from public folder
    fetch('/REPORT.md')
      .then(response => response.text())
      .then(content => {
        // Extract report from markers if present
        const whiteboxMatch = content.match(/===WHITEBOX_REPORT_START===(.*?)===WHITEBOX_REPORT_END===/s);
        const blackboxMatch = content.match(/===BLACKBOX_REPORT_START===(.*?)===BLACKBOX_REPORT_END===/s);
        
        if (whiteboxMatch) {
          setStaticReport(whiteboxMatch[1].trim());
        } else if (blackboxMatch) {
          setStaticReport(blackboxMatch[1].trim());
        } else {
          // Use raw content if no markers
          setStaticReport(content);
        }
      })
      .catch(err => {
        console.error("Failed to load static report:", err);
      });
  }, []);

  // Setup SSE for real-time scanning
  const scanUrl = `/api/assessments/${assessmentId}/scan`;
  
  // Prepare body - userId will be extracted from session in API route
  // Only send targetUrl, gitRepoUrl, and type (NO userId)
  const requestBody = useMemo(
    () =>
      assessment && ('targetUrl' in assessment || 'gitRepoUrl' in assessment) && (assessment.targetUrl || assessment.gitRepoUrl)
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
  const { fetchReport, isLoading: isLoadingReport, reportData, error: fetchError } = useFetchReport({
    onSuccess: async (data) => {
      if (data.success && data.report && assessment) {
        console.log("[AssessmentDetail] Report fetched successfully, parsing...");
        // Show the report viewer
        setShowReportViewer(true);
        try {
          await parseReport({
            assessmentId,
            report: data.report,
            userId,
          });
          // Don't update status to completed here - it's already completed from stream
          console.log("[AssessmentDetail] Report parsed successfully");
        } catch (err) {
          console.error("[AssessmentDetail] Failed to parse fetched report:", err);
          showError("Failed to parse report. Please try again.");
        }
      }
    },
    onError: (err) => {
      console.error("[AssessmentDetail] Failed to fetch report:", err);
      showError(`Failed to fetch report: ${err.message}`);
    },
  });

  const { logs, connectionStatus, isStreaming, finalReport, error, retryCount, reconnectDelay, maxRetries, start, stop, reconnect } = useSSEReconnect(scanUrl, {
    method: "POST",
    body: requestBody,
    maxRetries: 10,
    maxBackoffMs: 30000, // 30 seconds max delay
    healthCheckIntervalMs: 60000, // Check health every 60 seconds
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
            const funcName = part.functionCall.name;
            const funcArgs = part.functionCall.args 
              ? `\n  Args: ${JSON.stringify(part.functionCall.args, null, 2)}` 
              : "";
            pendingLogs.current.push({
              assessmentId,
              timestamp: event.timestamp || Date.now(),
              author: event.author || "agent",
              text: `${funcName}${funcArgs}`,
              type: "functionCall",
            });
          }
          if (part.functionResponse) {
            const funcName = part.functionResponse.name;
            const funcResponse = part.functionResponse.response
              ? `\n  Response: ${JSON.stringify(part.functionResponse.response, null, 2)}`
              : "";
            pendingLogs.current.push({
              assessmentId,
              timestamp: event.timestamp || Date.now(),
              author: event.author || "agent",
              text: `${funcName}${funcResponse}`,
              type: "functionResponse",
            });
          }
        }
      }
      
      // Handle events without parts (notifications)
      if ((!event.content?.parts || event.content.parts.length === 0) && (event.type || event.role)) {
        pendingLogs.current.push({
          assessmentId,
          timestamp: event.timestamp || Date.now(),
          author: event.author || event.role || "system",
          text: JSON.stringify(event),
          type: "notification",
        });
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
    onStreamEnd: async () => {
      console.log("[AssessmentDetail] Stream ended - marking assessment as completed");
      // Mark assessment as completed when stream ends
      if (assessment) {
        try {
          await updateAssessmentStatus({
            assessmentId,
            status: "completed",
            completedAt: Date.now(),
          });
          
          // Check if we have a final report from the stream
          // The report will be set in finalReport state by the hook
          // We'll show success message accordingly
          showSuccess("✅ Assessment completed! Report is ready below.");
        } catch (err) {
          console.error("[AssessmentDetail] Failed to update status:", err);
        }
      }
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

      // Save the report to database if we have it
      if (report && assessment) {
        try {
          const reportType = ('type' in assessment && assessment.type) 
            ? (assessment.type as "blackbox" | "whitebox")
            : "blackbox";
          
          console.log("[AssessmentDetail] Saving report to database...");
          await saveReport({
            assessmentId,
            report,
            reportType,
            createdByUserId: userId,
          });
          console.log("[AssessmentDetail] ✅ Report saved to database successfully");
          showSuccess("✅ Report saved successfully!");
        } catch (err) {
          console.error("[AssessmentDetail] Failed to save report to database:", err);
          showError("Failed to save report to database");
        }
      }

      console.log("[AssessmentDetail] Scan completed successfully");
    },
    onError: async (err) => {
      console.error("SSE error:", err);
      // Don't fail the assessment on connection errors
      // The reconnection mechanism will handle it
      // Assessment continues running on the backend
      console.log("[AssessmentDetail] Connection error occurred, but assessment continues running. Will attempt to reconnect.");
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

  // Automatically start or resume scan when assessment is running
  useEffect(() => {
    if (!assessment || assessment.status !== "running") {
      return;
    }

    // Check if we have required data
    const hasTarget = 'type' in assessment && assessment.type === "blackbox"
      ? ('targetUrl' in assessment && !!assessment.targetUrl)
      : ('gitRepoUrl' in assessment && !!assessment.gitRepoUrl);
    
    if (!hasTarget) {
      console.warn("[AssessmentDetail] Missing target URL or git repo URL");
      return;
    }

    // Check if request body is ready
    if (!requestBody) {
      console.warn("[AssessmentDetail] Request body not ready yet");
      return;
    }

    // Start or resume connection
    const shouldStart = !scanTriggered.current || (connectionStatus === "disconnected" && !isStreaming);
    
    if (shouldStart) {
      console.log("[AssessmentDetail] Starting/resuming scan for assessment:", assessmentId);
      console.log("[AssessmentDetail] Connection status:", connectionStatus, "Is streaming:", isStreaming);
      scanTriggered.current = true;
      
      // Small delay to ensure component is ready
      const timeoutId = setTimeout(() => {
        console.log("[AssessmentDetail] Calling start()");
        start();
      }, 500);

      return () => {
        clearTimeout(timeoutId);
        // Don't stop the connection when user navigates away
        // The assessment will continue running in the background
        // User can come back and reconnect to see updates
        console.log("[AssessmentDetail] Component unmounting, but scan continues in background");
      };
    }
  }, [assessment, assessmentId, requestBody, start, connectionStatus, isStreaming]);

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
  // When assessment is completed, show logs in descending order (newest first)
  // When running, show logs in ascending order (oldest first) for live streaming
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

    const combined = [...uniquePersistedLogs, ...logs];
    
    // Sort based on assessment status
    if (assessment?.status === "completed") {
      // Descending order (newest first) for completed assessments
      return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else {
      // Ascending order (oldest first) for running assessments
      return combined.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
  }, [persistedLogs, logs, assessment]);

  // Extract saved report from database
  const savedReportContent = useMemo(() => {
    if (!savedReport || savedReport.length === 0) return null;
    
    try {
      const latestReport = savedReport[0]; // Most recent report
      const reportData = JSON.parse(latestReport.data);
      return reportData.report || null;
    } catch (err) {
      console.error("[AssessmentDetail] Failed to parse saved report:", err);
      return null;
    }
  }, [savedReport]);

  // Use saved report if available, otherwise use finalReport from stream
  const displayReport = savedReportContent || finalReport;

  if (assessment === undefined) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-4 w-24 rounded bg-muted/60 animate-pulse" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-8 w-64 rounded bg-muted/60 animate-pulse" />
              <div className="h-4 w-96 max-w-full rounded bg-muted/40 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="h-8 w-24 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-10 w-20 rounded-lg bg-muted/60 animate-pulse" />
          </div>
        </div>

        {/* Info Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="h-3 w-16 rounded bg-muted/50" />
              <div className="h-5 w-24 rounded bg-muted/60" />
            </div>
          ))}
        </div>

        {/* Terminal Skeleton */}
        <div className="rounded-xl border border-gray-200 bg-gray-900 overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-600" />
              <div className="w-3 h-3 rounded-full bg-gray-600" />
              <div className="w-3 h-3 rounded-full bg-gray-600" />
            </div>
            <div className="h-3 w-16 rounded bg-gray-700 animate-pulse" />
          </div>
          <div className="p-4 h-96 bg-gray-900 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="h-3 w-32 rounded bg-gray-800" />
                <div className="h-3 w-full rounded bg-gray-800" />
                <div className="h-3 w-5/6 rounded bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
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
      showSuccess("✨ Assessment deleted successfully!");
      // Small delay before redirect to ensure UI updates
      setTimeout(() => {
        router.push('projectId' in assessment && assessment.projectId ? `/projects/${assessment.projectId}` : "/dashboard");
      }, 500);
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage = error?.message || "Failed to delete assessment. Please try again.";
      showError(`💥 ${errorMessage}`);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      {ToastComponent}
      
      {/* Report Viewer Modal */}
      {showReportViewer && staticReport && (
        <ReportViewer 
          staticReport={staticReport}
          reportType={('type' in assessment && assessment.type) ? assessment.type as "whitebox" | "blackbox" : "blackbox"}
          onClose={() => setShowReportViewer(false)} 
        />
      )}
      
      <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            href={'projectId' in assessment && assessment.projectId ? `/projects/${assessment.projectId}` : "/dashboard"}
            className="text-muted-foreground hover:text-primary transition-colors font-display flex-shrink-0"
          >
            ← Back to Project
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-display font-bold text-foreground truncate">{'name' in assessment ? assessment.name : 'Unknown'}</h1>
            {'description' in assessment && assessment.description && (
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
              Are you sure you want to delete <strong className="text-foreground">{'name' in assessment ? assessment.name : 'this assessment'}</strong>? 
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
            {'type' in assessment ? assessment.type : 'Unknown'}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase font-display mb-2">Target Type</div>
          <div className="text-sm font-medium capitalize font-display text-foreground">
            {'targetType' in assessment ? assessment.targetType : 'Unknown'}
          </div>
        </div>
        {'targetUrl' in assessment && assessment.targetUrl && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase font-display mb-2">Target URL</div>
            <div className="text-sm font-medium truncate font-display text-foreground">
              {assessment.targetUrl}
            </div>
          </div>
        )}
        {'gitRepoUrl' in assessment && assessment.gitRepoUrl && (
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
          {/* Connection Status */}
          <ConnectionStatus 
            status={connectionStatus}
            retryCount={retryCount}
            maxRetries={maxRetries}
            reconnectDelay={reconnectDelay}
            onReconnect={reconnect}
          />
          
          <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/20 dark:to-cyan-950/20 p-8">
            <div className="flex flex-col items-center justify-center gap-6 text-center min-h-[400px]">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-border border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 border-4 border-transparent border-r-cyan-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <div className="space-y-4 max-w-2xl mx-auto">
                <h3 className="text-2xl font-display font-bold text-foreground">
                  🔍 Security Scan in Progress
                </h3>
                <p className="text-base text-muted-foreground font-display">
                  Our cyber ninjas are hard at work analyzing your code! 🥷
                </p>
                <div className="mt-6 p-6 rounded-xl bg-white/50 dark:bg-black/20 border border-sky-200 dark:border-sky-800">
                  <p className="text-sm font-display font-semibold text-foreground mb-3">
                    ⏱️ This usually takes 5-10 minutes
                  </p>
                  <p className="text-sm text-muted-foreground font-display mb-4">
                    Feel free to grab a coffee ☕, 
                    <a 
                      href="https://www.youtube.com/results?search_query=funny+cat+videos" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline font-semibold mx-1"
                    >
                      watch some funny cat videos 🐱 on YouTube
                    </a>
                    , or just relax! Your scan will continue running even if you navigate away.
                  </p>
                  <p className="text-xs text-muted-foreground font-display italic">
                    💡 Pro tip: You can come back anytime and reconnect to see the latest updates!
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
                  {connectionStatus === "connected" && (
                    <span className="px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-display font-semibold">
                      🟢 Live & Connected
                    </span>
                  )}
                  {connectionStatus === "connecting" && (
                    <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-display font-semibold">
                      🔵 Connecting...
                    </span>
                  )}
                  {connectionStatus === "reconnecting" && (
                    <span className="px-3 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-display font-semibold">
                      🟡 Reconnecting ({retryCount}/{maxRetries})...
                    </span>
                  )}
                  {connectionStatus === "disconnected" && isStreaming && (
                    <span className="px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-display font-semibold">
                      🔴 Disconnected (scan continues in background)
                    </span>
                  )}
                  {allLogs.length > 0 && (
                    <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-display">
                      📊 {allLogs.length} log entries
                    </span>
                  )}
                  {persistedLogs && persistedLogs.length > 0 && (
                    <span className="px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-display">
                      💾 {persistedLogs.length} persisted
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <TerminalViewer logs={allLogs} isStreaming={isStreaming} />
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4">
              <p className="text-sm text-red-800 font-display font-semibold mb-1">
                Scan Error
              </p>
              <p className="text-sm text-red-700 font-display mb-2">
                {error.message}
              </p>
              <button
                onClick={() => {
                  scanTriggered.current = false;
                  start();
                }}
                className="mt-2 px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Retry Scan
              </button>
            </div>
          )}
          {fetchError && (
            <div className="rounded-xl border border-orange-300 bg-orange-50 p-4">
              <p className="text-sm text-orange-800 font-display font-semibold mb-1">
                Report Fetch Error
              </p>
              <p className="text-sm text-orange-700 font-display mb-2">
                {fetchError.message}
              </p>
              <button
                onClick={async () => {
                  if (assessment && 'type' in assessment && assessment.type) {
                    try {
                      await fetchReport(assessmentId, assessment.type as "blackbox" | "whitebox");
                    } catch (err) {
                      console.error("Retry failed:", err);
                    }
                  }
                }}
                disabled={isLoadingReport}
                className="mt-2 px-3 py-1.5 text-xs text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoadingReport ? "Retrying..." : "Retry Fetch"}
              </button>
            </div>
          )}
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg border border-border">
            <div>Status: {connectionStatus === "connected" ? "🟢 Connected" : connectionStatus === "reconnecting" ? `🟡 Reconnecting (${retryCount}/${maxRetries})` : connectionStatus === "connecting" ? "🔵 Connecting" : "🔴 Disconnected"}</div>
            <div>Live logs: {logs.length}</div>
            <div>Total logs: {allLogs.length}</div>
            {persistedLogs && persistedLogs.length > 0 && (
              <div>Persisted logs: {persistedLogs.length} (restored from database)</div>
            )}
            {reconnectDelay > 0 && (
              <div>Next reconnect in: {Math.ceil(reconnectDelay / 1000)}s</div>
            )}
            {finalReport && (
              <div className="text-green-600 font-semibold">✅ Report extracted from stream ({finalReport.length} chars)</div>
            )}
          </div>
          
          {/* Final Report Display - Shows when SSE completes with report */}
          {finalReport && connectionStatus === "disconnected" && (
            <div className="rounded-2xl border border-primary/20 bg-card shadow-lg">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                      📄 Security Assessment Report
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Report extracted from scan • {finalReport.length} characters
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const blob = new Blob([finalReport], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const reportType = ('type' in assessment && assessment.type) ? assessment.type : "blackbox";
                      a.download = `${reportType}_report_${assessmentId}_${new Date().getTime()}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-display font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Report
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="prose prose-slate dark:prose-invert max-w-none
                  prose-headings:font-display prose-headings:font-bold
                  prose-h1:text-3xl prose-h1:mb-4 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border
                  prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-foreground prose-p:leading-relaxed
                  prose-ul:list-disc prose-ul:pl-6
                  prose-ol:list-decimal prose-ol:pl-6
                  prose-li:text-foreground prose-li:my-1
                  prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-table:border-collapse prose-table:w-full
                  prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2
                  prose-td:border prose-td:border-border prose-td:p-2
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {finalReport}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Logs Display for Completed Assessments */}
          {assessment.status === "completed" && allLogs.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-foreground">
                  📋 Scan Logs
                </h2>
                <span className="text-sm text-muted-foreground font-display">
                  {allLogs.length} log entries (newest first)
                </span>
              </div>
              <TerminalViewer logs={allLogs} isStreaming={false} />
            </div>
          )}
          
          {/* Saved Report Display for Completed Assessments */}
          {assessment.status === "completed" && displayReport && (
            <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-card to-card/50 shadow-xl mb-6">
              <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
                      <span className="text-3xl">📄</span>
                      Security Assessment Report
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Report saved to database • {displayReport.length.toLocaleString()} characters
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                        💾 Saved
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!displayReport) return;
                      const blob = new Blob([displayReport], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const reportType = ('type' in assessment && assessment.type) ? assessment.type : "blackbox";
                      a.download = `${reportType}_report_${assessmentId}_${new Date().getTime()}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-display font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Report
                  </button>
                </div>
              </div>
              <div className="p-6 bg-card/50">
                <div className="prose prose-slate dark:prose-invert max-w-none
                  prose-headings:font-display prose-headings:font-bold
                  prose-h1:text-3xl prose-h1:mb-4 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border prose-h1:text-foreground
                  prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-foreground
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-foreground
                  prose-p:text-foreground prose-p:leading-relaxed prose-p:my-4
                  prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4
                  prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4
                  prose-li:text-foreground prose-li:my-2
                  prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-table:border-collapse prose-table:w-full prose-table:my-6
                  prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-3 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
                  prose-td:border prose-td:border-border prose-td:p-3 prose-td:text-foreground
                  prose-a:text-primary prose-a:underline prose-a:hover:text-primary/80
                  prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                  prose-hr:border-border prose-hr:my-8
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {displayReport}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
          
          {assessment.status === "completed" && !displayReport && (
            <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/20 p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-lg text-green-800 dark:text-green-400 font-display font-semibold mb-2">
                    ✅ Assessment Completed Successfully!
                  </p>
                    <p className="text-sm text-green-700 dark:text-green-300 font-display">
                      The security scan has finished. The report will appear here once it&apos;s available.
                    </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
