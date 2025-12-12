// components/dashboard-sidebar.tsx

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Settings, Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Mini projects list for sidebar
function ProjectsList({ orgId }: { orgId: string }) {
  const projects = useQuery(api.organizations.getProjects, { orgId });

  if (projects === undefined) {
    return <div className="text-xs text-muted-foreground px-3 py-2">Loading...</div>;
  }

  if (projects.length === 0) {
    return <div className="text-xs text-muted-foreground px-3 py-2">No projects yet</div>;
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {projects.slice(0, 5).map((project, index) => (
        <Link
          key={project._id}
          href={`/projects/${project._id}`}
          className="block rounded-lg px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors truncate"
          title={project.name}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {project.name}
        </Link>
      ))}
      {projects.length > 5 && (
        <div className="text-xs text-muted-foreground px-3 py-1">
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
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const currentOrg = useQuery(api.organizations.get, { orgId: currentOrgId });
  const allOrgs = useQuery(api.organizations.listByUser, { userId });
  const members = useQuery(api.organizations.getMembers, { orgId: currentOrgId });
  const stats = useQuery(api.organizations.getStats, { orgId: currentOrgId });
  const user = useQuery(api.users.getById, { userId });

  const creditsValue =
    currentOrg && "credits" in currentOrg ? (currentOrg.credits as number) ?? 0 : 0;
  const creditCap = Math.max(creditsValue, 100);
  const creditPct = Math.min(Math.round((creditsValue / creditCap) * 100), 100);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? "64px" : "256px",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full border-r border-border/80 bg-card/90 backdrop-blur text-foreground overflow-hidden flex flex-col relative group"
    >
      <div className="overflow-y-auto flex-1 p-4 space-y-6">
        {/* Toggle Button - Always at top left */}
        <div className="pb-4 border-b border-border">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center hover:bg-secondary/80 transition-all duration-200 group ${
              isCollapsed ? "mx-auto" : ""
            }`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </button>
        </div>
        {/* Navigation Links */}
        {!isCollapsed && (
          <div className="pb-4 border-b border-border space-y-2">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors group text-sm font-medium ${
                pathname === "/dashboard"
                  ? "bg-gradient-to-r from-sky-500/20 to-cyan-500/20 text-primary border border-primary/30"
                  : "text-foreground hover:bg-secondary/80"
              }`}
            >
              <Home className={`w-5 h-5 transition-colors flex-shrink-0 ${
                pathname === "/dashboard"
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary"
              }`} />
              <span className="truncate">Dashboard</span>
            </Link>
          </div>
        )}

        {/* User Profile Section */}
        {!isCollapsed && session && user && (
          <div className="pb-4 border-b border-border">
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-secondary/80 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden ring-2 ring-sky-500/20 group-hover:ring-sky-400/40 transition-all duration-300 flex-shrink-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || user.email}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-sm font-semibold text-sky-400 group-hover:text-sky-300 transition-colors">
                    {(user.name || user.email)[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user.name || user.email}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Link>
          </div>
        )}

        {/* Current Organization */}
        {!isCollapsed && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Organization
              </h2>
              {allOrgs && allOrgs.length > 1 && (
                <button
                  onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Switch
                </button>
              )}
            </div>
            {currentOrg && "name" in currentOrg && (
              <div className="rounded-xl border border-primary/10 bg-card/80 p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground font-display text-base truncate">
                      {currentOrg.name}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI coverage for your workspace
                    </p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary/90 flex-shrink-0">
                    Active
                  </div>
                </div>
                {"plan" in currentOrg && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-full bg-secondary text-foreground capitalize text-xs"
                      title="Plan controls credit refill cadence"
                    >
                      {currentOrg.plan}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Optimized for fast AI scans
                    </span>
                  </div>
                )}
                {"credits" in currentOrg && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Credits:</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-full transition-all duration-300 text-xs ${
                            creditsValue < 3
                              ? "text-yellow-700 bg-yellow-50"
                              : "text-sky-700 bg-sky-50"
                          }`}
                          title="Credits used when running AI scans"
                        >
                          {creditsValue}
                        </span>
                        {creditsValue < 3 && <span className="text-yellow-700">⚠️</span>}
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all`}
                        style={{ width: `${creditPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Keep a small buffer to avoid scan interruptions.
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Org Switcher */}
            {showOrgSwitcher && allOrgs && allOrgs.length > 1 && (
              <div className="mt-3 space-y-2">
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
                    <div className="truncate">
                      {"name" in org ? org.name : ""}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {"role" in org ? `(${org.role})` : ""}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {!isCollapsed && stats && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
        {!isCollapsed && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase font-display tracking-wide">
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
              <div className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-display px-3 py-2">No members yet</p>
                ) : (
                  members.map((member, index) => (
                    <div
                      key={member.membershipId}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 border border-border bg-card hover:bg-secondary hover:scale-[1.02] transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center text-xs font-semibold text-sky-600 ring-2 ring-sky-500/20 flex-shrink-0">
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
              <div className="text-xs text-muted-foreground font-display px-3 py-2 rounded-lg bg-secondary">
                {members.length} {members.length === 1 ? "member" : "members"}
              </div>
            )}
          </div>
        )}

        {/* Projects (Targets) List */}
        {!isCollapsed && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Projects
            </h2>
            <ProjectsList orgId={currentOrgId} />
          </div>
        )}
      </div>
    </motion.aside>
  );
}

