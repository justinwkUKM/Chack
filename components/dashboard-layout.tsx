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

  if (defaultOrg === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-sm text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!defaultOrg) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-sm text-slate-400">No organization found</div>
      </div>
    );
  }

  return (
    <>
      <DashboardSidebar currentOrgId={defaultOrg._id} userId={userId} />
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-slate-400">
              Welcome back! Manage your security assessments.
            </p>
          </div>
          <DashboardContent userId={userId} />
        </div>
      </main>
    </>
  );
}

