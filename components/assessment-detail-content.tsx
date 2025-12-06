// components/assessment-detail-content.tsx

"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
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
  const assessment = useQuery(api.assessments.get, { assessmentId });
  const updateAssessmentStatus = useMutation(api.assessments.updateStatus);
  const parseReport = useMutation(api.assessments.parseReport);
  const scanTriggered = useRef(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);

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
    onComplete: async (report) => {
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

  if (assessment === undefined) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-sky-500"></div>
        <p className="text-sm text-gray-700 mt-4 font-display">Loading...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-700 font-display">Assessment not found</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-sky-600 hover:text-sky-500 transition-colors font-display"
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-gray-700 hover:text-sky-600 transition-colors font-display"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold text-black">{assessment.name}</h1>
          {assessment.description && (
            <p className="text-sm text-gray-700">{assessment.description}</p>
          )}
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize border ${getStatusColor(
            assessment.status
          )} font-display`}
        >
          {assessment.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-600 uppercase font-display mb-2">Type</div>
          <div className="text-sm font-medium capitalize font-display text-black">
            {assessment.type}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-600 uppercase font-display mb-2">Target Type</div>
          <div className="text-sm font-medium capitalize font-display text-black">
            {assessment.targetType}
          </div>
        </div>
        {assessment.targetUrl && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-600 uppercase font-display mb-2">Target URL</div>
            <div className="text-sm font-medium truncate font-display text-black">
              {assessment.targetUrl}
            </div>
          </div>
        )}
        {assessment.gitRepoUrl && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-600 uppercase font-display mb-2">Git Repository</div>
            <div className="text-sm font-medium truncate font-display text-black">
              {assessment.gitRepoUrl}
            </div>
          </div>
        )}
      </div>

      {assessment.status === "running" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-500/30 bg-white p-6">
            <h3 className="text-xl font-display font-semibold text-black mb-2">
              Scan in Progress
            </h3>
            <p className="text-sm text-gray-700 font-display">
              Running security assessment... Real-time logs are shown below.
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {isStreaming ? "🟢 Streaming active" : "⏸️ Waiting to start..."}
              {logs.length > 0 && ` | ${logs.length} log entries`}
              {isFetchingReport && " | 📥 Fetching report from session..."}
            </div>
          </div>
          <TerminalViewer logs={logs} isStreaming={isStreaming} />
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
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>Status: {isStreaming ? "🟢 Streaming" : "⏸️ Not streaming"}</div>
            <div>Logs received: {logs.length}</div>
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

