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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">Pentest Platform</h1>
        <p className="text-slate-300">
          Log in to start blackbox and whitebox security assessments.
        </p>
        <div className="flex gap-3">
          <Link
            href="/auth/login"
            className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
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

