// app/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkOnboarding } from "@/app/actions/onboarding";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 animate-fade-in bg-white">
        <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent animate-pulse-slow">
          CHACK
        </h1>
        <p className="text-gray-800">
          Log in to start blackbox and whitebox security assessments.
        </p>
        <div className="flex gap-4 mt-4">
          <Link
            href="/auth/login"
            className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  // Check onboarding status before redirecting
  const onboarded = await checkOnboarding(session.user.id);
  if (!onboarded) {
    redirect("/onboarding");
  }

  // If logged in and onboarded, send user to dashboard
  redirect("/dashboard");
}

