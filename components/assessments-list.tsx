// components/assessments-list.tsx

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AssessmentsListProps {
  projectId: string;
}

export default function AssessmentsList({ projectId }: AssessmentsListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentDescription, setAssessmentDescription] = useState("");
  const [assessmentType, setAssessmentType] = useState("blackbox");
  const [targetType, setTargetType] = useState("web_app");
  const [targetUrl, setTargetUrl] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");

  const assessments = useQuery(api.assessments.list, { projectId }) ?? [];
  const createAssessment = useMutation(api.assessments.create);
  const project = useQuery(api.projects.get, { projectId });
  const org = useQuery(
    api.organizations.get,
    project && "orgId" in project && project.orgId ? { orgId: project.orgId } : "skip"
  );
  const hasCredits = org && "credits" in org ? (org.credits ?? 0) > 0 : false;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !assessmentName.trim()) return;

    try {
      // Create assessment (status will be "running")
      const assessmentId = await createAssessment({
        projectId,
        name: assessmentName,
        description: assessmentDescription || undefined,
        type: assessmentType,
        targetType,
        targetUrl: assessmentType === "blackbox" ? (targetUrl || undefined) : undefined,
        gitRepoUrl: assessmentType === "whitebox" ? (gitRepoUrl || undefined) : undefined,
        createdByUserId: session.user.id,
      });

      setAssessmentName("");
      setAssessmentDescription("");
      setTargetUrl("");
      setGitRepoUrl("");
      setShowCreateForm(false);

      // Redirect to assessment detail page to show loading state
      // The scan will be automatically triggered on the detail page
      router.push(`/assessments/${assessmentId}`);
    } catch (error: any) {
      alert(error.message || "Failed to create assessment. You may not have enough credits.");
      console.error("Assessment creation error:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400";
      case "running":
        return "bg-blue-500/20 text-blue-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <section className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold from-gray-900 to-black">Assessments</h2>
        <div className="flex items-center gap-3">
          {org && "credits" in org && (
            <div className="text-xs text-gray-700">
              Credits:{" "}
              <span
                className={`font-semibold ${
                  (org.credits ?? 0) < 3 ? "text-yellow-700" : "text-black"
                }`}
              >
                {org.credits ?? 0}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={!hasCredits}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
            title={!hasCredits ? "Insufficient credits. Please upgrade your plan." : ""}
          >
            {showCreateForm ? "Cancel" : "+ New Assessment"}
          </button>
        </div>
      </div>

      {org && "credits" in org && (org.credits ?? 0) < 3 && (org.credits ?? 0) > 0 && (
        <div className="rounded-xl border border-yellow-500/50 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-900 font-display">
            ⚠️ Low credits! You have {org.credits ?? 0} credit(s) remaining.{" "}
            <Link href="/settings" className="underline hover:text-yellow-800 transition-colors">
              Upgrade your plan
            </Link>{" "}
            to get more credits.
          </p>
        </div>
      )}

      {org && "credits" in org && (org.credits ?? 0) === 0 && (
        <div className="rounded-xl border border-red-500/50 bg-red-50 p-4">
          <p className="text-sm text-red-900 font-display">
            ❌ No credits remaining.{" "}
            <Link href="/settings" className="underline hover:text-red-800 transition-colors">
              Upgrade your plan
            </Link>{" "}
            to create assessments.
          </p>
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-black mb-2 font-display">
              Assessment Name *
            </label>
            <input
              type="text"
              placeholder="Security Scan - Q1 2025"
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2 font-display">
              Description (optional)
            </label>
            <textarea
              placeholder="Brief description of this assessment..."
              value={assessmentDescription}
              onChange={(e) => setAssessmentDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2 font-display">
                Assessment Type *
              </label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
              >
                <option value="blackbox">Blackbox</option>
                <option value="whitebox">Whitebox</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2 font-display">
                Target Type *
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
              >
                <option value="web_app">Web Application</option>
                <option value="api">API</option>
                <option value="mobile">Mobile App</option>
                <option value="network">Network</option>
              </select>
            </div>
          </div>

          {assessmentType === "blackbox" ? (
            <div>
              <label className="block text-sm font-medium text-black mb-2 font-display">
                Target URL *
              </label>
              <input
                type="url"
                placeholder="https://app.example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required={assessmentType === "blackbox"}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-black mb-2 font-display">
                Git Repository URL *
              </label>
              <input
                type="url"
                placeholder="https://github.com/user/repo.git"
                value={gitRepoUrl}
                onChange={(e) => setGitRepoUrl(e.target.value)}
                required={assessmentType === "whitebox"}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!assessmentName.trim() || (assessmentType === "blackbox" && !targetUrl.trim()) || (assessmentType === "whitebox" && !gitRepoUrl.trim())}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
          >
            Create Assessment
          </button>
        </form>
      )}

      <div className="space-y-3">
        {assessments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-700 font-display">
              No assessments yet. Create your first assessment to start scanning.
            </p>
          </div>
        ) : (
          assessments.map((assessment, index) => (
            <Link
              key={assessment._id}
              href={`/assessments/${assessment._id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-sky-300 hover:shadow-md transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg text-black">{assessment.name}</h3>
                  {assessment.description && (
                    <p className="mt-2 text-sm text-gray-700">
                      {assessment.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">{assessment.type}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">{assessment.targetType}</span>
                    {assessment.targetUrl && (
                      <span className="truncate max-w-xs text-gray-500">{assessment.targetUrl}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize border ${getStatusColor(
                      assessment.status
                    )}`}
                  >
                    {assessment.status}
                  </span>
                  <span className="text-sky-600 text-xl">→</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

