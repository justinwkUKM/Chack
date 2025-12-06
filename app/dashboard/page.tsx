// app/dashboard/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkOnboarding } from "@/app/actions/onboarding";
import DashboardLayout from "@/components/dashboard-layout";

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

  return (
    <div className="flex">
      <DashboardLayout userId={session.user.id} />
    </div>
  );
}

