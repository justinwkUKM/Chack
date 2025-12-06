// hooks/use-fetch-report.ts

import { useState, useCallback } from "react";

export interface ReportData {
  success: boolean;
  report?: string;
  source?: string;
  sessionId?: string;
  reportType?: string;
  length?: number;
  hasMarkers?: boolean;
  error?: string;
  details?: {
    sessionId?: string;
    reportType?: string;
    availableStateKeys?: string[];
    eventsCount?: number;
    suggestions?: string[];
  };
}

export interface UseFetchReportOptions {
  onSuccess?: (data: ReportData) => void;
  onError?: (error: Error) => void;
}

export function useFetchReport(options: UseFetchReportOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const fetchReport = useCallback(
    async (assessmentId: string, reportType: "blackbox" | "whitebox" = "blackbox") => {
      setIsLoading(true);
      setError(null);
      setReportData(null);

      try {
        console.log(`[useFetchReport] Fetching report for assessment: ${assessmentId}, type: ${reportType}`);
        
        const url = `/api/assessments/${assessmentId}/report?type=${reportType}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data: ReportData = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        console.log(`[useFetchReport] Report fetched successfully:`, {
          success: data.success,
          source: data.source,
          length: data.length,
          hasMarkers: data.hasMarkers,
        });

        setReportData(data);

        if (data.success && options.onSuccess) {
          options.onSuccess(data);
        }

        return data;
      } catch (err) {
        console.error("[useFetchReport] Error fetching report:", err);
        const error = err instanceof Error ? err : new Error("Failed to fetch report");
        setError(error);

        if (options.onError) {
          options.onError(error);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setReportData(null);
  }, []);

  return {
    fetchReport,
    isLoading,
    error,
    reportData,
    reset,
  };
}

