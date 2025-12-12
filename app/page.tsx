import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkOnboarding } from "@/app/actions/onboarding";
import { CyberGrid } from "@/components/cyber-grid";
import { TerminalTyper } from "@/components/terminal-typer";
import type { Metadata } from "next";
import { isStripeConfigured } from "@/lib/stripeConfig";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://chack.dev";

export const metadata: Metadata = {
  title: "CHACK - Autonomous AI Pentest Agent | Find Vulnerabilities Before Attackers Do",
  description: "CHACK finds what attackers will, before they do. Paste your URL and get enterprise-grade security reports in minutes. Autonomous blackbox and whitebox security assessments with OWASP Top 10 coverage.",
  openGraph: {
    title: "CHACK - Autonomous AI Pentest Agent",
    description: "Get enterprise-grade security reports in minutes. CHACK's autonomous agent performs comprehensive security assessments with OWASP Top 10 coverage.",
    url: siteUrl,
    siteName: "CHACK",
    images: [
      {
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "CHACK - Autonomous AI Pentest Agent",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CHACK - Autonomous AI Pentest Agent",
    description: "Get enterprise-grade security reports in minutes. Reduce pentest costs by 99.5%.",
    images: [`${siteUrl}/opengraph-image`],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "CHACK",
      "applicationCategory": "SecurityApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5",
        "ratingCount": "1",
      },
      "description": "Autonomous AI pentest agent that performs both blackbox and whitebox security assessments. Get enterprise-grade security reports in minutes.",
      "featureList": [
        "Blackbox security testing",
        "Whitebox security testing",
        "OWASP Top 10 coverage",
        "Automated vulnerability scanning",
        "Real-time security reports",
        "GitHub repository integration",
      ],
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      <main className="bg-background px-4 py-12 animate-fade-in text-foreground relative overflow-hidden min-h-screen">
        <CyberGrid />
        
        {/* Subtle animated background gradient overlay */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50/30 via-cyan-50/20 to-transparent dark:from-sky-950/10 dark:via-cyan-950/5" />
          <div className="absolute -top-1/2 -left-1/2 h-[800px] w-[800px] animate-gradient-xy rounded-full bg-gradient-to-r from-sky-400/10 via-cyan-400/10 to-transparent blur-3xl opacity-50" />
          <div className="absolute -bottom-1/2 -right-1/2 h-[800px] w-[800px] animate-gradient-xy-delayed rounded-full bg-gradient-to-r from-cyan-400/10 via-sky-400/10 to-transparent blur-3xl opacity-50" />
        </div>

        <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col lg:flex-row items-center gap-12 px-4 pt-8 pb-16">
          {/* Hero Text Content */}
          <div className="flex-1 flex flex-col items-center lg:items-start gap-8 text-center lg:text-left z-10">
            <div className="space-y-6 animate-slide-up">
              <p className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/20 animate-scale-in backdrop-blur-sm">
                <span className="mr-2 relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                AI pentesting for modern dev teams
              </p>
              <h1 className="text-5xl font-display font-bold tracking-tight text-foreground sm:text-7xl animate-fade-in leading-[1.1]" style={{ animationDelay: '0.1s' }}>
                CHACK finds what <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-500">attackers will</span>, before they do.
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl animate-fade-in max-w-2xl" style={{ animationDelay: '0.2s' }}>
                Paste your URL and CHACK&apos;s autonomous agent maps your surface, probes OWASP risks,
                and returns prioritized fixes with repro steps—no waiting on human scheduling.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <Link
                href="/auth/login"
                className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all duration-300 hover:scale-105 hover:from-sky-400 hover:to-cyan-400 font-display hover:shadow-xl hover:shadow-sky-500/40 animate-pulse-glow"
              >
                Run a safe AI pentest
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline transition-all duration-200 px-4 py-2"
              >
                See how it works
              </Link>
            </div>
            <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.7s' }}>
              Start in minutes with a test domain. No procurement required.
            </p>
          </div>

          {/* Hero Terminal Animation */}
          <div className="flex-1 w-full max-w-xl relative animate-fade-in-delayed lg:mt-0 mt-8">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl blur opacity-20 animate-pulse-slow"></div>
              <TerminalTyper />
            </div>
            
            {/* Decorative elements around terminal */}
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute -left-8 -top-8 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mx-auto max-w-6xl px-4 mb-20">
          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="group rounded-2xl border border-border bg-card/50 px-6 py-5 text-sm text-card-foreground shadow-sm animate-card-load hover:shadow-md transition-all duration-300 backdrop-blur-sm hover:border-primary/30 relative overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:animate-shimmer transition-all"></div>
              <div className="font-semibold mb-1 text-foreground">Comprehensive coverage</div>
              Recon, auth flows, OWASP Top 10, and misconfig scans.
            </div>
            <div className="group rounded-2xl border border-border bg-card/50 px-6 py-5 text-sm text-card-foreground shadow-sm animate-card-load hover:shadow-md transition-all duration-300 backdrop-blur-sm hover:border-primary/30 relative overflow-hidden" style={{ animationDelay: '0.4s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:animate-shimmer transition-all"></div>
              <div className="font-semibold mb-1 text-foreground">Actionable results</div>
              Reproducible paths, severity, and code-level fix guidance.
            </div>
            <div className="group rounded-2xl border border-border bg-card/50 px-6 py-5 text-sm text-card-foreground shadow-sm animate-card-load hover:shadow-md transition-all duration-300 backdrop-blur-sm hover:border-primary/30 relative overflow-hidden" style={{ animationDelay: '0.5s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:animate-shimmer transition-all"></div>
              <div className="font-semibold mb-1 text-foreground">Safe-by-default runs</div>
              Isolated agents, rate-limited traffic, audit trails.
            </div>
          </div>
        </div>

        <div
          id="how-it-works"
          className="mx-auto mt-10 max-w-5xl space-y-8 rounded-3xl border border-border bg-card/80 px-6 py-8 shadow-sm animate-fade-in-delayed backdrop-blur-sm"
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
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 group hover:-translate-y-1" style={{ animationDelay: '0.8s' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 1</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">Point CHACK at your URL</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Provide a target and optional auth hints; CHACK maps the surface and entry points.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 group hover:-translate-y-1" style={{ animationDelay: '0.9s' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 2</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">AI-driven probing</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Agent tests auth flows, inputs, and misconfigs across OWASP Top 10 with safe limits.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 group hover:-translate-y-1" style={{ animationDelay: '1s' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 3</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">Fix-ready findings</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get reproducible steps, severity, and remediation guidance your team can act on today.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-6xl space-y-6 text-center animate-fade-in-delayed">
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
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 hover:border-primary/50" style={{ animationDelay: '1.1s' }}>
              <h3 className="text-lg font-semibold text-foreground">Developer-friendly</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Plain-language findings with repro steps, curl examples, and code-level guidance.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 hover:border-primary/50" style={{ animationDelay: '1.2s' }}>
              <h3 className="text-lg font-semibold text-foreground">Continuously updated checks</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Library of attack patterns refreshed as new CVEs and misconfig classes emerge.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 hover:border-primary/50" style={{ animationDelay: '1.3s' }}>
              <h3 className="text-lg font-semibold text-foreground">Safety and governance</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Rate limits, isolation, and audit trails ensure tests stay controlled and reviewable.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 hover:border-primary/50" style={{ animationDelay: '1.4s' }}>
              <h3 className="text-lg font-semibold text-foreground">Fast time to signal</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Runs start immediately; early findings surface in minutes with severity prioritization.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 hover:border-primary/50" style={{ animationDelay: '1.5s' }}>
              <h3 className="text-lg font-semibold text-foreground">Team workflow ready</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Assign owners, track status, and export evidence for compliance or auditors.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-left shadow-sm animate-card-load hover:shadow-md transition-all duration-300 hover:border-primary/50" style={{ animationDelay: '1.6s' }}>
              <h3 className="text-lg font-semibold text-foreground">Blackbox and beyond</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Support for authenticated flows, role-specific paths, and environment-safe testing.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Plans Section */}
        <div className="mx-auto mt-20 max-w-6xl space-y-6 text-center animate-fade-in-delayed">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Simple, transparent pricing
            </p>
            <h2 className="text-3xl font-display font-semibold text-foreground sm:text-4xl">
              Choose the plan that fits your team
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              Start free and scale as you grow. No credit card required.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 mt-12">
            {/* Free Plan */}
            <div className="rounded-2xl border border-border bg-card/50 px-6 py-8 shadow-sm animate-card-load hover:shadow-md transition-all duration-300 backdrop-blur-sm hover:border-primary/30 flex flex-col" style={{ animationDelay: '1.7s' }}>
              <h3 className="text-xl font-semibold text-foreground">Free</h3>
              <p className="mt-1 text-sm text-muted-foreground">Perfect for getting started</p>
              
              <div className="mt-6 mb-6">
                <p className="text-4xl font-bold text-foreground">$0<span className="text-lg text-muted-foreground">/month</span></p>
              </div>

              <div className="space-y-1 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>10 tests per month</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Basic vulnerability scanning</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>OWASP Top 10 coverage</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Community support</span>
                </div>
              </div>

              <Link
                href="/auth/login"
                className="w-full rounded-lg border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary transition-all duration-300 hover:bg-primary/10 hover:shadow-sm"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            {(() => {
              // Safely check if Stripe is configured - wrap in try-catch to prevent any errors
              let stripeConfigured = false;
              try {
                stripeConfigured = isStripeConfigured();
              } catch (error) {
                // If there's any error checking Stripe config, default to false
                console.warn("Error checking Stripe configuration:", error);
                stripeConfigured = false;
              }
              return (
                <div className={`rounded-2xl border-2 ${stripeConfigured ? 'border-primary' : 'border-border opacity-60'} bg-card/80 px-6 py-8 shadow-lg animate-card-load hover:shadow-xl transition-all duration-300 backdrop-blur-sm flex flex-col relative`} style={{ animationDelay: '1.8s' }}>
                  {stripeConfigured && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-semibold px-4 py-1 rounded-full">Most Popular</span>
              </div>
                  )}

              <h3 className="text-xl font-semibold text-foreground">Pro</h3>
              <p className="mt-1 text-sm text-muted-foreground">For growing teams</p>
              
              <div className="mt-6 mb-6">
                    <p className="text-4xl font-bold text-foreground">$49<span className="text-lg text-muted-foreground">/year</span></p>
                    <p className="text-sm text-muted-foreground mt-2">Billed annually</p>
              </div>

                  {!stripeConfigured && (
                    <div className="mb-4 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                      ⚠️ Currently unavailable (Payment processing not configured)
                    </div>
                  )}

              <div className="space-y-1 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>1,000 tests per month</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Advanced vulnerability scanning</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Authenticated flow testing</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Priority email support</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Team collaboration</span>
                </div>
              </div>

              {stripeConfigured ? (
                <Link
                  href="/auth/login"
                  className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 bg-gradient-to-r from-sky-500 to-cyan-500 shadow-sky-500/30 hover:shadow-lg hover:shadow-sky-500/40 hover:scale-105"
                >
                  Start Free Trial
                </Link>
              ) : (
                <div
                  className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 bg-gray-400 cursor-not-allowed opacity-50 pointer-events-none"
                  title="Pro plan upgrades are currently unavailable"
                >
                  Unavailable
                </div>
              )}
            </div>
              );
            })()}

            {/* Enterprise Plan */}
            <div className="rounded-2xl border border-border bg-card/50 px-6 py-8 shadow-sm animate-card-load hover:shadow-md transition-all duration-300 backdrop-blur-sm hover:border-primary/30 flex flex-col" style={{ animationDelay: '1.9s' }}>
              <h3 className="text-xl font-semibold text-foreground">Enterprise</h3>
              <p className="mt-1 text-sm text-muted-foreground">For large organizations</p>
              
              <div className="mt-6 mb-6">
                <p className="text-2xl font-bold text-foreground">Custom pricing</p>
                <p className="text-sm text-muted-foreground mt-2">Based on your needs</p>
              </div>

              <div className="space-y-1 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Unlimited tests</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Custom integrations</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Advanced compliance tools</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>Dedicated support</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <span className="text-primary font-semibold">✓</span>
                  <span>SLA guarantee</span>
                </div>
              </div>

              <Link
                href="mailto:sales@chack.dev"
                className="w-full rounded-lg border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary transition-all duration-300 hover:bg-primary/10 hover:shadow-sm"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-20 mb-10 max-w-4xl rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-8 text-center text-white shadow-xl animate-fade-in-delayed relative overflow-hidden">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-sky-400/0 via-white/10 to-cyan-400/0 animate-shimmer pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-3xl font-display font-semibold sm:text-4xl">
              Ready to see what an AI pentest finds on your stack?
            </h3>
            <p className="mt-3 text-base text-sky-50 sm:text-lg">
              Launch a safe run in minutes and get fix-ready findings your developers can trust.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/login"
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-sky-700 shadow-md shadow-sky-900/10 transition-all duration-300 hover:scale-105 hover:shadow-lg dark:bg-slate-900 dark:text-white"
              >
                Start a test run
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-semibold text-white underline-offset-4 hover:underline transition-all duration-200"
              >
                Review the workflow
              </Link>
            </div>
            <p className="mt-3 text-xs uppercase tracking-wide text-sky-100">
              Safe test domains · Audit trails · OWASP-focused coverage
            </p>
          </div>
        </div>
      </main>
      </>
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
