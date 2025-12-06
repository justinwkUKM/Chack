// components/project-detail-content.tsx

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import AssessmentsList from "./assessments-list";

interface ProjectDetailContentProps {
  projectId: string;
  userId: string;
}

export default function ProjectDetailContent({
  projectId,
  userId,
}: ProjectDetailContentProps) {
  const router = useRouter();
  const project = useQuery(api.projects.get, { projectId });
  const deleteProject = useMutation(api.projects.deleteProject);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!project) return;
    
    setIsDeleting(true);
    try {
      await deleteProject({ projectId });
      router.push("/dashboard");
    } catch (error: any) {
      alert(error.message || "Failed to delete project");
      console.error("Delete error:", error);
      setIsDeleting(false);
    }
  };

  if (project === undefined) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
        <p className="text-sm text-muted-foreground mt-4 font-display">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground font-display">Project not found</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-primary hover:text-primary/80 transition-colors font-display"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-primary transition-colors font-display flex-shrink-0"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-display font-bold text-foreground truncate">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300 flex-shrink-0"
          title="Delete project"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-display font-bold text-foreground mb-3">
              Delete Project?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong className="text-foreground">{project.name}</strong>? 
              This will permanently delete the project and all its assessments, findings, and results. 
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
                    Delete Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <AssessmentsList projectId={projectId} />
    </div>
  );
}

