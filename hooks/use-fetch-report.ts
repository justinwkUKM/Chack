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
  validation?: {
    valid: boolean;
    missingKeywords: string[];
    missingSections: string[];
    keywordCount: number;
    sectionCount: number;
    totalKeywords: number;
    totalSections: number;
  };
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

        // Try to parse JSON response
        let data: ReportData;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error("[useFetchReport] Failed to parse JSON response:", parseError);
          throw new Error(`Server returned invalid JSON (status: ${response.status})`);
        }

        // Handle non-ok responses
        if (!response.ok) {
          const errorMessage = data.error || `Request failed with status ${response.status}`;
          console.error("[useFetchReport] Request failed:", {
            status: response.status,
            error: errorMessage,
            details: data.details,
          });
          throw new Error(errorMessage);
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
        
        // Create a user-friendly error message
        let errorMessage = "Failed to fetch report";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }
        
        const error = new Error(errorMessage);
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

