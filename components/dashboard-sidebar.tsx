// components/dashboard-sidebar.tsx

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

// Mini projects list for sidebar
function ProjectsList({ orgId }: { orgId: string }) {
  const projects = useQuery(api.organizations.getProjects, { orgId });

  if (projects === undefined) {
    return <div className="text-xs text-slate-500">Loading...</div>;
  }

  if (projects.length === 0) {
    return <div className="text-xs text-slate-500">No projects yet</div>;
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {projects.slice(0, 5).map((project) => (
        <Link
          key={project._id}
          href={`/projects/${project._id}`}
          className="block rounded px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 truncate"
          title={project.name}
        >
          {project.name}
        </Link>
      ))}
      {projects.length > 5 && (
        <div className="text-xs text-slate-500 px-2">
          +{projects.length - 5} more
        </div>
      )}
    </div>
  );
}

// Mini assessments list for sidebar
function AssessmentsList({ orgId }: { orgId: string }) {
  const assessments = useQuery(api.organizations.getAssessments, { orgId });

  if (assessments === undefined) {
    return <div className="text-xs text-slate-500">Loading...</div>;
  }

  if (assessments.length === 0) {
    return <div className="text-xs text-slate-500">No assessments yet</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "running":
        return "text-blue-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {assessments.slice(0, 5).map((assessment) => (
        <Link
          key={assessment._id}
          href={`/assessments/${assessment._id}`}
          className="block rounded px-2 py-1.5 text-xs hover:bg-slate-800 group"
          title={assessment.name}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-300 group-hover:text-slate-100 truncate flex-1">
              {assessment.name}
            </span>
            <span className={`text-xs ${getStatusColor(assessment.status)}`}>
              ●
            </span>
          </div>
        </Link>
      ))}
      {assessments.length > 5 && (
        <div className="text-xs text-slate-500 px-2">
          +{assessments.length - 5} more
        </div>
      )}
    </div>
  );
}

interface DashboardSidebarProps {
  currentOrgId: string;
  userId: string;
}

export default function DashboardSidebar({
  currentOrgId,
  userId,
}: DashboardSidebarProps) {
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const currentOrg = useQuery(api.organizations.get, { orgId: currentOrgId });
  const allOrgs = useQuery(api.organizations.listByUser, { userId });
  const members = useQuery(api.organizations.getMembers, { orgId: currentOrgId });
  const stats = useQuery(api.organizations.getStats, { orgId: currentOrgId });

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900 min-h-screen">
      <div className="p-4 space-y-6">
        {/* Current Organization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase">
              Organization
            </h2>
            {allOrgs && allOrgs.length > 1 && (
              <button
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                className="text-xs text-sky-500 hover:text-sky-400"
              >
                Switch
              </button>
            )}
          </div>
          {currentOrg && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="font-semibold text-slate-100">
                {currentOrg.name}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Plan: <span className="capitalize">{currentOrg.plan}</span>
              </div>
            </div>
          )}

          {/* Org Switcher */}
          {showOrgSwitcher && allOrgs && allOrgs.length > 1 && (
            <div className="mt-2 space-y-1">
              {allOrgs.map((org) => (
                <Link
                  key={org._id}
                  href="/dashboard"
                  className={`block rounded px-3 py-2 text-sm ${
                    org._id === currentOrgId
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {org.name}
                  <span className="ml-2 text-xs text-slate-500 capitalize">
                    ({org.role})
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase">
              Overview
            </h2>
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded px-3 py-2 bg-slate-950 border border-slate-800">
                <span className="text-sm text-slate-300">Projects</span>
                <span className="text-sm font-semibold text-slate-100">
                  {stats.projectsCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded px-3 py-2 bg-slate-950 border border-slate-800">
                <span className="text-sm text-slate-300">Assessments</span>
                <span className="text-sm font-semibold text-slate-100">
                  {stats.assessmentsCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase">
              Members
            </h2>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="text-xs text-slate-500 hover:text-slate-400"
            >
              {showMembers ? "Hide" : "Show"}
            </button>
          </div>
          {showMembers && members && (
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-xs text-slate-500">No members yet</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.membershipId}
                    className="flex items-center gap-2 rounded px-2 py-1.5 bg-slate-950 border border-slate-800"
                  >
                    <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center text-xs font-semibold text-sky-400">
                      {member.name?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 truncate">
                        {member.name || member.email}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">
                        {member.role}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {!showMembers && members && (
            <div className="text-sm text-slate-400">
              {members.length} {members.length === 1 ? "member" : "members"}
            </div>
          )}
        </div>

        {/* Projects (Targets) List */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase mb-2">
            Projects
          </h2>
          <ProjectsList orgId={currentOrgId} />
        </div>

        {/* Assessments List */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase mb-2">
            Assessments
          </h2>
          <AssessmentsList orgId={currentOrgId} />
        </div>
      </div>
    </aside>
  );
}

