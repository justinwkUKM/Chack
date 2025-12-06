// components/findings-list.tsx

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface FindingsListProps {
  assessmentId: string;
  userId: string;
}

export default function FindingsList({
  assessmentId,
  userId,
}: FindingsListProps) {
  const findings = useQuery(api.findings.list, { assessmentId }) ?? [];

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <section className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold text-black">Findings</h2>
        <div className="text-sm text-gray-700">
          {findings.length} {findings.length === 1 ? "finding" : "findings"}
        </div>
      </div>

      <div className="space-y-3">
        {findings.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-700 font-display">
              No findings yet. Findings will appear here once the scan completes.
            </p>
          </div>
        ) : (
          findings.map((finding, index) => (
            <div
              key={finding._id}
              className={`rounded-xl border p-5 hover:scale-[1.01] transition-all duration-300 animate-fade-in ${getSeverityColor(finding.severity)}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display font-semibold text-lg">{finding.title}</h3>
                    <span className="rounded-full px-3 py-1 text-xs font-medium capitalize bg-white border border-gray-300">
                      {finding.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{finding.description}</p>
                  {finding.location && (
                    <p className="mt-3 text-xs font-mono bg-white px-2 py-1 rounded border border-gray-200 inline-block">
                      📍 {finding.location}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <span className="px-2 py-1 rounded-full bg-white border border-gray-200 capitalize">Status: {finding.status}</span>
                    {finding.cvssScore && (
                      <span className="px-2 py-1 rounded-full bg-white border border-gray-200">CVSS: {finding.cvssScore.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

