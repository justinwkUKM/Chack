// components/dashboard-layout.tsx

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardContent from "./dashboard-content";

interface DashboardLayoutProps {
  userId: string;
}

export default function DashboardLayout({ userId }: DashboardLayoutProps) {
  const defaultOrg = useQuery(api.auth.getDefaultOrg, { userId });
  const orgStats = useQuery(
    api.organizations.getStats,
    defaultOrg ? { orgId: defaultOrg._id } : "skip"
  );

  if (defaultOrg === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="text-sm text-muted-foreground">Loading...</div>
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
    <div className="flex h-screen bg-background pt-16">
      <DashboardSidebar currentOrgId={defaultOrg._id} userId={userId} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-8 bg-background text-foreground">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-emerald-500/5 p-6 shadow-lg shadow-sky-500/10">
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
                        <h1 className="text-3xl font-bold text-foreground font-display mb-1">
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
    <div className="rounded-xl border border-white/20 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/10">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-xl font-bold text-foreground font-display">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

