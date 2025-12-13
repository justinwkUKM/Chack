// components/dashboard-layout.tsx

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardContent from "./dashboard-content";
import { Menu, X } from "lucide-react";

interface DashboardLayoutProps {
  userId: string;
}

export default function DashboardLayout({ userId }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const defaultOrg = useQuery(api.auth.getDefaultOrg, { userId });
  const orgStats = useQuery(
    api.organizations.getStats,
    defaultOrg ? { orgId: defaultOrg._id } : "skip"
  );

  if (defaultOrg === undefined) {
    return (
      <div className="flex h-screen bg-background pt-16">
        {/* Sidebar Skeleton */}
        <aside className="w-64 shrink-0 border-r border-border bg-card/40">
          <div className="p-4 space-y-4 animate-pulse">
            <div className="h-8 w-32 rounded bg-muted/60" />
            <div className="h-10 w-full rounded-lg bg-muted/50" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted/40" />
              <div className="h-8 w-full rounded bg-muted/50" />
            </div>
          </div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-8 bg-background">
              <div className="mx-auto max-w-7xl space-y-6">
                {/* Header Card Skeleton */}
                <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-emerald-500/5 p-6 space-y-4 animate-pulse">
                  <div className="h-6 w-32 rounded-full bg-muted/60" />
                  <div className="h-8 w-64 rounded bg-muted/60" />
                  <div className="h-4 w-96 max-w-full rounded bg-muted/40" />
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 rounded-xl bg-muted/50" />
                    ))}
                  </div>
                </div>

                {/* Projects Skeleton */}
                <div className="space-y-4">
                  <div className="h-7 w-32 rounded bg-muted/60 animate-pulse" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border bg-card p-5 space-y-3 animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div className="h-6 w-48 rounded bg-muted/50" />
                        <div className="h-4 w-full rounded bg-muted/40" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!defaultOrg) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="text-sm text-muted-foreground">No organization found</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background pt-16 md:h-screen">
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[80%] max-w-xs transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DashboardSidebar
          currentOrgId={defaultOrg._id}
          userId={userId}
          isMobile
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="hidden md:block">
        <DashboardSidebar currentOrgId={defaultOrg._id} userId={userId} />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 text-foreground md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`rounded-full border border-border bg-card p-2 shadow-sm transition-opacity ${
              isSidebarOpen ? "opacity-100" : "opacity-50"
            } md:hidden`}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 text-foreground sm:px-6 md:px-8 bg-background">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 space-y-4 md:mb-8">
                <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-emerald-500/5 p-5 shadow-lg shadow-sky-500/10 sm:p-6">
                  <div className="absolute inset-0 pointer-events-none opacity-70">
                    <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />
                  </div>
                  <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-white/10 dark:text-sky-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        AI Pentester Active
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-foreground font-display mb-1 sm:text-3xl">
                          Your security copilot is live
                        </h1>
                        <p className="text-sm text-muted-foreground font-display max-w-2xl">
                          Tracking {'name' in defaultOrg ? defaultOrg.name : 'your organization'} with always-on coverage. Review signals,
                          launch checks, and keep your stakeholders in the loop.
                        </p>
                      </div>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:w-auto">
                      <StatPill
                        label="Projects"
                        value={orgStats?.projectsCount ?? "—"}
                        hint="tracked"
                      />
                      <StatPill
                        label="Assessments"
                        value={orgStats?.assessmentsCount ?? "—"}
                        hint="total runs"
                      />
                      <StatPill
                        label="Credits"
                        value={'credits' in defaultOrg && typeof defaultOrg.credits === "number" ? defaultOrg.credits : "—"}
                        hint="available"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DashboardContent userId={userId} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatPill({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="group relative rounded-xl border border-white/20 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/10
                    transition-all duration-300 ease-out
                    hover:scale-110 hover:shadow-xl hover:shadow-sky-500/20
                    hover:border-sky-300/50 hover:bg-white/80 dark:hover:bg-white/20
                    cursor-pointer
                    before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-sky-500/0 before:to-cyan-500/0
                    before:transition-all before:duration-300
                    hover:before:from-sky-500/10 hover:before:to-cyan-500/10
                    overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500/0 to-cyan-500/0
                      group-hover:from-sky-500/20 group-hover:to-cyan-500/20
                      transition-all duration-500 blur-xl opacity-0 group-hover:opacity-100" />

      <div className="relative z-10">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold
                        transition-colors duration-300 group-hover:text-sky-700 dark:group-hover:text-sky-300">
          {label}
        </div>
        <div className="text-xl font-bold text-foreground font-display
                        transition-all duration-300 group-hover:scale-105 group-hover:text-sky-600 dark:group-hover:text-sky-400">
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground
                        transition-colors duration-300 group-hover:text-sky-600/80 dark:group-hover:text-sky-400/80">
          {hint}
        </div>
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                      transition-transform duration-1000 ease-in-out
                      bg-gradient-to-r from-transparent via-white/20 to-transparent
                      skew-x-12" />
    </div>
  );
}
