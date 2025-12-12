// components/dashboard-content.tsx

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ProjectsList from "./projects-list";

interface DashboardContentProps {
  userId: string;
}

export default function DashboardContent({ userId }: DashboardContentProps) {
  const defaultOrg = useQuery(api.auth.getDefaultOrg, { userId });

  if (defaultOrg === undefined) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Projects List Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-32 rounded bg-muted/60 animate-pulse" />
            <div className="h-10 w-40 rounded-xl bg-muted/60 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5 space-y-3 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="h-6 w-48 rounded bg-muted/50" />
                <div className="h-4 w-full rounded bg-muted/40" />
                <div className="h-4 w-5/6 rounded bg-muted/40" />
                <div className="flex items-center gap-3 mt-3">
                  <div className="h-5 w-16 rounded-full bg-muted/40" />
                  <div className="h-5 w-20 rounded-full bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!defaultOrg) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground font-display">
          No organization found. Please complete onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ProjectsList orgId={defaultOrg._id} />
    </div>
  );
}

