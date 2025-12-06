// components/project-detail-content.tsx

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import AssessmentsList from "./assessments-list";

interface ProjectDetailContentProps {
  projectId: string;
  userId: string;
}

export default function ProjectDetailContent({
  projectId,
  userId,
}: ProjectDetailContentProps) {
  const project = useQuery(api.projects.get, { projectId });

  if (project === undefined) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-sky-500"></div>
        <p className="text-sm text-gray-700 mt-4 font-display">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-700 font-display">Project not found</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-sky-600 hover:text-sky-500 transition-colors font-display"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-gray-700 hover:text-sky-600 transition-colors font-display"
        >
          ← Back to Dashboard
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-black">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-gray-700">{project.description}</p>
          )}
        </div>
      </div>

      <AssessmentsList projectId={projectId} />
    </div>
  );
}

