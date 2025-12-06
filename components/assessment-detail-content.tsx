// components/assessment-detail-content.tsx

"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import FindingsList from "./findings-list";
import ResultsList from "./results-list";

interface AssessmentDetailContentProps {
  assessmentId: string;
  userId: string;
}

export default function AssessmentDetailContent({
  assessmentId,
  userId,
}: AssessmentDetailContentProps) {
  const assessment = useQuery(api.assessments.get, { assessmentId });
  const runScan = useMutation(api.assessments.runScan);
  const scanTriggered = useRef(false);

  // Automatically trigger scan after 5 seconds if assessment is running
  useEffect(() => {
    if (assessment?.status === "running" && !scanTriggered.current) {
      scanTriggered.current = true;
      
      const startTime = assessment.startedAt || assessment.createdAt || Date.now();
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 5000 - elapsed);

      const timeoutId = setTimeout(async () => {
        try {
          await runScan({
            assessmentId,
            userId,
          });
        } catch (error) {
          console.error("Failed to run scan:", error);
          scanTriggered.current = false; // Allow retry on error
        }
      }, remainingTime);

      return () => clearTimeout(timeoutId);
    }
  }, [assessment, assessmentId, userId, runScan]);

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
      </div>

      {assessment.status === "running" ? (
        <div className="rounded-2xl border border-sky-500/30 bg-white p-12 text-center animate-fade-in">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-gray-300 border-t-sky-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 border-4 border-transparent border-r-cyan-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold text-black">
                Scan in Progress
              </h3>
              <p className="text-sm text-gray-700 mt-2 font-display">
                Running security assessment... This may take a few seconds.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <FindingsList assessmentId={assessmentId} userId={userId} />
          <ResultsList assessmentId={assessmentId} userId={userId} />
        </>
      )}
    </div>
  );
}

