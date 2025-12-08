// app/dashboard/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkOnboarding } from "@/app/actions/onboarding";
import DashboardLayout from "@/components/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your security assessments, projects, and findings in real-time. Manage your organization's security posture with CHACK.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Check if user is onboarded
  const onboarded = await checkOnboarding(session.user.id);
  if (!onboarded) {
    redirect("/onboarding");
  }

  return <DashboardLayout userId={session.user.id} />;
}

