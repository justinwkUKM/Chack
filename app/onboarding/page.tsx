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
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-24 animate-fade-in bg-white">
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">
          Welcome 🎉
        </h1>
        <p className="text-gray-800">Let&apos;s set up your workspace.</p>
      </div>
      <OnboardingForm userId={session.user.id} />
    </main>
  );
}

