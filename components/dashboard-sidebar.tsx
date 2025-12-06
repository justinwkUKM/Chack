// components/dashboard-sidebar.tsx

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Settings } from "lucide-react";

// Mini projects list for sidebar
function ProjectsList({ orgId }: { orgId: string }) {
  const projects = useQuery(api.organizations.getProjects, { orgId });

  if (projects === undefined) {
    return <div className="text-xs text-gray-600">Loading...</div>;
  }

  if (projects.length === 0) {
    return <div className="text-xs text-gray-600">No projects yet</div>;
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {projects.slice(0, 5).map((project, index) => (
        <Link
          key={project._id}
          href={`/projects/${project._id}`}
          className="block rounded-lg px-3 py-2 text-xs text-black"
          title={project.name}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {project.name}
        </Link>
      ))}
      {projects.length > 5 && (
        <div className="text-xs text-gray-600">
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
    return <div className="text-xs text-gray-600">Loading...</div>;
  }

  if (assessments.length === 0) {
    return <div className="text-xs text-gray-600">No assessments yet</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "running":
        return "text-blue-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {assessments.slice(0, 5).map((assessment, index) => (
        <Link
          key={assessment._id}
          href={`/assessments/${assessment._id}`}
          className="block rounded-lg px-3 py-2 text-xs hover:bg-gray-100 group border border-transparent hover:border-gray-200 hover:scale-[1.02] transition-all duration-300"
          title={assessment.name}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-black group-hover:text-sky-600 truncate flex-1 font-display transition-colors">
              {assessment.name}
            </span>
            <span className={`text-xs ${getStatusColor(assessment.status)} animate-pulse-slow`}>
              ●
            </span>
          </div>
        </Link>
      ))}
      {assessments.length > 5 && (
        <div className="text-xs text-gray-600 px-3 py-1 font-display">
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
  const { data: session } = useSession();
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const currentOrg = useQuery(api.organizations.get, { orgId: currentOrgId });
  const allOrgs = useQuery(api.organizations.listByUser, { userId });
  const members = useQuery(api.organizations.getMembers, { orgId: currentOrgId });
  const stats = useQuery(api.organizations.getStats, { orgId: currentOrgId });
  const user = useQuery(api.users.getById, { userId });

  return (
    <aside className="w-64 border-r border-gray-200">
      <div className="p-4 space-y-6">
        {/* User Profile Section */}
        {session && user && (
          <div className="pb-4 border-b border-gray-200">
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden ring-2 ring-sky-500/20 group-hover:ring-sky-400/40 transition-all duration-300">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || user.email}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-sm font-semibold text-sky-400 group-hover:text-sky-300 transition-colors">
                    {(user.name || user.email)[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-black">
                  {user.name || user.email}
                </div>
                <div className="text-xs text-gray-600">
                  {user.email}
                </div>
              </div>
              <Settings className="w-4 h-4 text-gray-700" />
            </Link>
          </div>
        )}

        {/* Current Organization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-700">
              Organization
            </h2>
            {allOrgs && allOrgs.length > 1 && (
              <button
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                className="text-xs text-sky-600"
              >
                Switch
              </button>
            )}
          </div>
          {currentOrg && "name" in currentOrg && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div className="font-semibold text-black font-display text-base">
                {currentOrg.name}
              </div>
              {"plan" in currentOrg && (
                <div className="text-xs text-gray-700 mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 capitalize">
                    {currentOrg.plan}
                  </span>
                </div>
              )}
              {"credits" in currentOrg && (
                <div className="text-xs text-gray-700 mt-2 flex items-center gap-2">
                  <span>Credits:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full transition-all duration-300 ${
                      (currentOrg.credits ?? 0) < 3
                        ? "text-yellow-700 bg-yellow-50"
                        : "text-sky-700 bg-sky-50"
                    }`}
                  >
                    {currentOrg.credits ?? 0}
                  </span>
                  {(currentOrg.credits ?? 0) < 3 && (
                    <span className="text-yellow-700">⚠️</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Org Switcher */}
          {showOrgSwitcher && allOrgs && allOrgs.length > 1 && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {allOrgs.map((org, index) => (
                <Link
                  key={org._id}
                  href="/dashboard"
                  className={`block rounded-xl px-4 py-2.5 text-sm transition-all duration-300 font-display border ${
                    org._id === currentOrgId
                      ? "bg-gradient-to-r from-sky-500/20 to-cyan-500/20 text-sky-800 border-sky-300"
                      : "text-gray-800 border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {"name" in org ? org.name : ""}
                  <span className="ml-2 text-xs text-gray-600">
                    {"role" in org ? `(${org.role})` : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="text-xs font-semibold text-gray-700">
              Overview
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-gray-200 bg-white">
                <span className="text-sm text-black font-display">Projects</span>
                <span className="text-lg font-display font-bold text-sky-600">
                  {stats.projectsCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-gray-200 bg-white">
                <span className="text-sm text-black font-display">Assessments</span>
                <span className="text-lg font-display font-bold text-cyan-600">
                  {stats.assessmentsCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-700 uppercase font-display tracking-wider">
              Members
            </h2>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="text-xs text-gray-600 hover:text-sky-600 transition-colors duration-300 font-display"
            >
              {showMembers ? "Hide" : "Show"}
            </button>
          </div>
          {showMembers && members && (
            <div className="space-y-2 animate-fade-in">
              {members.length === 0 ? (
                <p className="text-xs text-gray-600 font-display">No members yet</p>
              ) : (
                members.map((member, index) => (
                  <div
                    key={member.membershipId}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 hover:scale-[1.02] transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center text-xs font-semibold text-sky-600 ring-2 ring-sky-500/20">
                      {member.name?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-black truncate font-display">
                        {member.name || member.email}
                      </div>
                      <div className="text-xs text-gray-600 capitalize">
                        {member.role}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {!showMembers && members && (
            <div className="text-sm text-gray-700 font-display px-2 py-1 rounded-full bg-gray-100 inline-block">
              {members.length} {members.length === 1 ? "member" : "members"}
            </div>
          )}
        </div>

        {/* Projects (Targets) List */}
        <div className="animate-fade-in">
          <h2 className="text-xs font-semibold text-gray-700">
            Projects
          </h2>
          <ProjectsList orgId={currentOrgId} />
        </div>

        {/* Assessments List */}
        <div className="animate-fade-in">
          <h2 className="text-xs font-semibold text-gray-700">
            Assessments
          </h2>
          <AssessmentsList orgId={currentOrgId} />
        </div>
      </div>
    </aside>
  );
}

