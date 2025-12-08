// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Navbar } from "@/components/navbar";
import { UserSync } from "@/components/user-sync";
import { OnboardingCheck } from "@/components/onboarding-check";
import { ThemeProvider } from "@/components/theme-provider";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://chack.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CHACK - Autonomous AI Pentest Agent | Security Assessment Platform",
    template: "%s | CHACK"
  },
  description: "CHACK is the world's first autonomous pentest agent that performs both blackbox and whitebox security assessments. Get enterprise-grade security reports in minutes, not weeks. Reduce pentest costs by 99.5% with AI-driven vulnerability scanning.",
  keywords: [
    "pentest",
    "penetration testing",
    "security assessment",
    "vulnerability scanning",
    "OWASP",
    "blackbox testing",
    "whitebox testing",
    "AI security",
    "automated security",
    "cybersecurity",
    "security testing",
    "web application security",
    "API security",
    "autonomous security agent"
  ],
  authors: [{ name: "CHACK Team" }],
  creator: "CHACK",
  publisher: "CHACK",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "CHACK",
    title: "CHACK - Autonomous AI Pentest Agent | Security Assessment Platform",
    description: "Get enterprise-grade security reports in minutes. CHACK's autonomous agent performs comprehensive blackbox and whitebox security assessments with OWASP Top 10 coverage.",
    images: [
      {
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "CHACK - Autonomous AI Pentest Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHACK - Autonomous AI Pentest Agent",
    description: "Get enterprise-grade security reports in minutes. Reduce pentest costs by 99.5% with AI-driven vulnerability scanning.",
    images: [`${siteUrl}/opengraph-image`],
    creator: "@chackdev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "Security",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <ConvexClientProvider>
            <ThemeProvider>
              <UserSync />
              <OnboardingCheck />
              <Navbar />
              {children}
            </ThemeProvider>
          </ConvexClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

