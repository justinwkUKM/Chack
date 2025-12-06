// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Navbar } from "@/components/navbar";
import { UserSync } from "@/components/user-sync";
import { OnboardingCheck } from "@/components/onboarding-check";

export const metadata: Metadata = {
  title: "Pentest Platform",
  description: "Blackbox & whitebox security assessment platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <AuthProvider>
          <ConvexClientProvider>
            <UserSync />
            <OnboardingCheck />
            <Navbar />
            {children}
          </ConvexClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

