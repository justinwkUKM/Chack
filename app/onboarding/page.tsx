// app/onboarding/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/onboarding-form";
import { checkOnboarding } from "@/app/actions/onboarding";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  // If already onboarded, redirect to dashboard
  const onboarded = await checkOnboarding(session.user.id);
  if (onboarded) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-24">
      <h1 className="text-3xl font-bold">Welcome 🎉</h1>
      <p className="text-slate-400">Let's set up your workspace.</p>
      <OnboardingForm userId={session.user.id} />
    </main>
  );
}

