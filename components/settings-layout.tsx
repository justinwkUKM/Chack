// components/settings-layout.tsx

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardSidebar from "@/components/dashboard-sidebar";
import SettingsContent from "@/components/settings-content";
import { Menu, X } from "lucide-react";

interface SettingsLayoutProps {
  userId: string;
}

export default function SettingsLayout({ userId }: SettingsLayoutProps) {
  const defaultOrg = useQuery(api.auth.getDefaultOrg, { userId });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="flex flex-1 w-full bg-background text-foreground">
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Mobile sidebar */}
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

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <DashboardSidebar currentOrgId={defaultOrg._id} userId={userId} />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden px-4 pb-10 pt-4 md:pt-10 bg-background text-foreground">
        <div className="flex items-center justify-between gap-3 md:hidden mb-4">
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
            }`}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            <div className="space-y-2">
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

