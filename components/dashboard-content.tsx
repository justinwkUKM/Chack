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
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!defaultOrg) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="text-sm text-slate-400">
          No organization found. Please complete onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectsList orgId={defaultOrg._id} />
    </div>
  );
}

