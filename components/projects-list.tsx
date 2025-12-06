// components/projects-list.tsx

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface ProjectsListProps {
  orgId: string;
}

export default function ProjectsList({ orgId }: ProjectsListProps) {
  const { data: session } = useSession();
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const projects = useQuery(api.projects.list, { orgId }) ?? [];
  const createProject = useMutation(api.projects.create);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !projectName.trim()) return;

    await createProject({
      orgId,
      name: projectName,
      description: projectDescription || undefined,
      createdByUserId: session.user.id,
    });

    setProjectName("");
    setProjectDescription("");
    setShowCreateForm(false);
  };

  return (
    <section className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold  from-gray-900 to-black">Projects</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
        >
          {showCreateForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2 font-display">
              Project Name *
            </label>
            <input
              type="text"
              placeholder="My Security Project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2 font-display">
              Description (optional)
            </label>
            <textarea
              placeholder="Brief description of this project..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={!projectName.trim()}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
          >
            Create Project
          </button>
        </form>
      )}

      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-700 font-display">
              No projects yet. Create your first project to get started.
            </p>
          </div>
        ) : (
          projects.map((project, index) => (
            <Link
              key={project._id}
              href={`/projects/${project._id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-sky-300 hover:shadow-md transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg text-black">{project.name}</h3>
                  {project.description && (
                    <p className="mt-2 text-sm text-gray-700">{project.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                    <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                      {project.status}
                    </span>
                  </div>
                </div>
                <span className="ml-4 text-sky-600 text-xl">→</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

