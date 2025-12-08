import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In to CHACK",
  description: "Sign in to CHACK with Google or GitHub to start running autonomous security assessments. Get enterprise-grade security reports in minutes.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

