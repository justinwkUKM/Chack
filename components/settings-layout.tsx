// components/settings-layout.tsx

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardSidebar from "@/components/dashboard-sidebar";
import SettingsContent from "@/components/settings-content";

interface SettingsLayoutProps {
  userId: string;
}

export default function SettingsLayout({ userId }: SettingsLayoutProps) {
  const defaultOrg = useQuery(api.auth.getDefaultOrg, { userId });

  if (defaultOrg === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white">
        <div className="text-sm text-gray-700">Loading...</div>
      </div>
    );
  }

  if (!defaultOrg) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white">
        <div className="text-sm text-gray-700">No organization found</div>
      </div>
    );
  }

  return (
    <>
      <DashboardSidebar currentOrgId={defaultOrg._id} userId={userId} />
      <main className="flex-1 px-4 py-10 bg-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-black font-display">Settings</h1>
            <p className="text-sm text-gray-700 font-display">
              Manage your profile, organization, and plan settings.
            </p>
          </div>
          <SettingsContent userId={userId} orgId={defaultOrg._id} />
        </div>
      </main>
    </>
  );
}

