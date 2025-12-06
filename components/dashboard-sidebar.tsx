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
    return <div className="text-xs text-muted-foreground">Loading...</div>;
  }

  if (projects.length === 0) {
    return <div className="text-xs text-muted-foreground">No projects yet</div>;
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {projects.slice(0, 5).map((project, index) => (
        <Link
          key={project._id}
          href={`/projects/${project._id}`}
          className="block rounded-lg px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
          title={project.name}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {project.name}
        </Link>
      ))}
      {projects.length > 5 && (
        <div className="text-xs text-muted-foreground">
          +{projects.length - 5} more
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
    <aside className="w-64 h-full border-r border-border bg-card text-foreground overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* User Profile Section */}
        {session && user && (
          <div className="pb-4 border-b border-border">
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-secondary transition-colors"
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
                <div className="text-sm font-medium text-foreground">
                  {user.name || user.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.email}
                </div>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        )}

        {/* Current Organization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground">
              Organization
            </h2>
            {allOrgs && allOrgs.length > 1 && (
              <button
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                className="text-xs text-primary"
              >
                Switch
              </button>
            )}
          </div>
          {currentOrg && "name" in currentOrg && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="font-semibold text-foreground font-display text-base">
                {currentOrg.name}
              </div>
              {"plan" in currentOrg && (
                <div className="text-xs text-muted-foreground mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground capitalize">
                    {currentOrg.plan}
                  </span>
                </div>
              )}
              {"credits" in currentOrg && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
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
                    : "text-foreground border-border bg-card hover:bg-secondary"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {"name" in org ? org.name : ""}
                <span className="ml-2 text-xs text-muted-foreground">
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
            <h2 className="text-xs font-semibold text-muted-foreground">
              Overview
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-border bg-card">
                <span className="text-sm text-foreground font-display">Projects</span>
                <span className="text-lg font-display font-bold text-sky-600">
                  {stats.projectsCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase font-display tracking-wider">
              Members
            </h2>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors duration-300 font-display"
            >
              {showMembers ? "Hide" : "Show"}
            </button>
          </div>
          {showMembers && members && (
            <div className="space-y-2 animate-fade-in">
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground font-display">No members yet</p>
              ) : (
                members.map((member, index) => (
                  <div
                    key={member.membershipId}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 border border-border bg-card hover:bg-secondary hover:scale-[1.02] transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center text-xs font-semibold text-sky-600 ring-2 ring-sky-500/20">
                      {member.name?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate font-display">
                        {member.name || member.email}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {!showMembers && members && (
            <div className="text-sm text-muted-foreground font-display px-2 py-1 rounded-full bg-secondary inline-block">
              {members.length} {members.length === 1 ? "member" : "members"}
            </div>
          )}
        </div>

        {/* Projects (Targets) List */}
        <div className="animate-fade-in">
          <h2 className="text-xs font-semibold text-muted-foreground">
            Projects
          </h2>
          <ProjectsList orgId={currentOrgId} />
        </div>
      </div>
    </aside>
  );
}

