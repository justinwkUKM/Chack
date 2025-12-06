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
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background text-muted-foreground">
        <div className="text-sm">Loading...</div>
      </div>
    );
  }

  if (!defaultOrg) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background text-muted-foreground">
        <div className="text-sm">No organization found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 w-full">
      <DashboardSidebar currentOrgId={defaultOrg._id} userId={userId} />
      <main className="flex-1 flex flex-col overflow-hidden px-4 py-10 bg-background text-foreground">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground font-display">Settings</h1>
              <p className="text-sm text-muted-foreground font-display">
                Manage your profile, organization, and plan settings.
              </p>
            </div>
            <SettingsContent userId={userId} orgId={defaultOrg._id} />
          </div>
        </div>
      </main>
    </div>
  );
}

