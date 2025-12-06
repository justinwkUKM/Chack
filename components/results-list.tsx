// components/results-list.tsx

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface ResultsListProps {
  assessmentId: string;
  userId: string;
}

export default function ResultsList({
  assessmentId,
  userId,
}: ResultsListProps) {
  const results = useQuery(api.results.list, { assessmentId }) ?? [];

  return (
    <section className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold text-black">Results</h2>
        <div className="text-sm text-gray-700">
          {results.length} {results.length === 1 ? "result" : "results"}
        </div>
      </div>

      <div className="space-y-3">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-700 font-display">
              No results yet. Results will appear here once the scan completes.
            </p>
          </div>
        ) : (
          results.map((result, index) => (
            <div
              key={result._id}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-display font-semibold capitalize text-lg text-black">{result.type.replace(/_/g, " ")}</h3>
                    <span className="text-xs text-gray-600 px-2 py-1 rounded-full bg-gray-100">
                      {new Date(result.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <pre className="mt-2 text-xs text-black bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
                    <code>{JSON.stringify(JSON.parse(result.data), null, 2)}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

