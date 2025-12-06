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
      <main className="bg-background px-4 py-12 animate-fade-in text-foreground">
        <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center gap-8 text-center">
          <div className="space-y-5">
            <p className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/20">
              AI pentesting for modern dev teams
            </p>
            <h1 className="text-5xl font-display font-bold tracking-tight text-foreground sm:text-6xl">
              CHACK finds what attackers will, before they do.
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Paste your URL and CHACK&apos;s autonomous agent maps your surface, probes OWASP risks,
              and returns prioritized fixes with repro steps—no waiting on human scheduling.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
              Comprehensive coverage: recon, auth flows, OWASP Top 10, and misconfig scans.
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
              Actionable results: reproducible paths, severity, and code-level fix guidance.
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
              Safe-by-default runs: isolated agents, rate-limited traffic, audit trails.
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all duration-300 hover:scale-105 hover:from-sky-400 hover:to-cyan-400 font-display"
            >
              Run a safe AI pentest
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              See how it works
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Start in minutes with a test domain. No procurement required.
          </p>
        </div>

        <div
          id="how-it-works"
          className="mx-auto mt-10 max-w-5xl space-y-8 rounded-3xl border border-border bg-card/80 px-6 py-8 shadow-sm"
        >
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              How CHACK works
            </p>
            <h2 className="text-3xl font-display font-semibold text-foreground sm:text-4xl">
              From URL to prioritized fixes—automatically
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              An autonomous agent does the recon, probing, and reporting so you can ship faster with
              confidence.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 1</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Point CHACK at your URL</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Provide a target and optional auth hints; CHACK maps the surface and entry points.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 2</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">AI-driven probing</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Agent tests auth flows, inputs, and misconfigs across OWASP Top 10 with safe limits.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 3</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Fix-ready findings</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get reproducible steps, severity, and remediation guidance your team can act on today.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-6xl space-y-6 text-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Why teams choose CHACK
            </p>
            <h2 className="text-3xl font-display font-semibold text-foreground sm:text-4xl">
              Built for security and engineering to move together
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              Replace slow pentest queues with always-on coverage, clear ownership, and safe-by-default
              execution.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Developer-friendly</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Plain-language findings with repro steps, curl examples, and code-level guidance.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Continuously updated checks</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Library of attack patterns refreshed as new CVEs and misconfig classes emerge.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Safety and governance</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Rate limits, isolation, and audit trails ensure tests stay controlled and reviewable.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Fast time to signal</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Runs start immediately; early findings surface in minutes with severity prioritization.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Team workflow ready</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Assign owners, track status, and export evidence for compliance or auditors.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Blackbox and beyond</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Support for authenticated flows, role-specific paths, and environment-safe testing.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-4xl rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-8 text-center text-white shadow-xl">
          <h3 className="text-3xl font-display font-semibold sm:text-4xl">
            Ready to see what an AI pentest finds on your stack?
          </h3>
          <p className="mt-3 text-base text-sky-50 sm:text-lg">
            Launch a safe run in minutes and get fix-ready findings your developers can trust.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-sky-700 shadow-md shadow-sky-900/10 transition-all duration-300 hover:scale-105"
            >
              Start a test run
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              Review the workflow
            </Link>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-sky-100">
            Safe test domains · Audit trails · OWASP-focused coverage
          </p>
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

