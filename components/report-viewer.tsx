// components/report-viewer.tsx

"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Download, CheckCircle, AlertCircle, FileText, Copy, Check } from "lucide-react";
import type { ReportData } from "@/hooks/use-fetch-report";

interface ReportViewerProps {
  reportData: ReportData;
  onClose: () => void;
}

export default function ReportViewer({ reportData, onClose }: ReportViewerProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");

  if (!reportData.report) {
    return null;
  }

  const handleDownload = () => {
    const blob = new Blob([reportData.report!], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportData.reportType}_report_${reportData.sessionId}_${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportData.report!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validation = reportData.validation;
  const isValid = validation?.valid ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">
                {reportData.reportType === "whitebox" ? "Whitebox" : "Blackbox"} Security Report
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Source: {reportData.source} • {reportData.length} characters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Status */}
        {validation && (
          <div className={`p-4 border-b border-border ${isValid ? "bg-green-50 dark:bg-green-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"}`}>
            <div className="flex items-center gap-3">
              {isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-semibold ${isValid ? "text-green-800 dark:text-green-200" : "text-yellow-800 dark:text-yellow-200"}`}>
                  {isValid ? "✓ Report Validation PASSED" : "⚠ Report Validation INCOMPLETE"}
                </p>
                <p className={`text-xs ${isValid ? "text-green-700 dark:text-green-300" : "text-yellow-700 dark:text-yellow-300"}`}>
                  Keywords: {validation.keywordCount}/{validation.totalKeywords} • 
                  Sections: {validation.sectionCount}/{validation.totalSections}
                </p>
              </div>
              {!isValid && validation.missingKeywords.length > 0 && (
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  Missing: {validation.missingKeywords.slice(0, 2).join(", ")}
                  {validation.missingKeywords.length > 2 && ` +${validation.missingKeywords.length - 2} more`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("rendered")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "rendered"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Rendered
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "raw"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Raw Markdown
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
              title="Download report"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === "rendered" ? (
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
                {reportData.report}
              </ReactMarkdown>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm text-foreground bg-muted/50 p-4 rounded-lg border border-border">
              {reportData.report}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

