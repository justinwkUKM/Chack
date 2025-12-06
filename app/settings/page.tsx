// app/settings/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkOnboarding } from "@/app/actions/onboarding";
import SettingsLayout from "@/components/settings-layout";

export default async function SettingsPage() {
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
    <div className="flex min-h-screen w-full bg-background text-foreground pt-16">
      <SettingsLayout userId={session.user.id} />
    </div>
  );
}

