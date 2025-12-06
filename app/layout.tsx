// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Navbar } from "@/components/navbar";
import { UserSync } from "@/components/user-sync";
import { OnboardingCheck } from "@/components/onboarding-check";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "CHACK",
  description: "Blackbox & whitebox security assessment platform",
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

