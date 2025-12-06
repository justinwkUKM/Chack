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
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-sky-500"></div>
        <p className="text-sm text-gray-700 mt-4 font-display">Loading...</p>
      </div>
    );
  }

  if (!defaultOrg) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-700 font-display">
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

