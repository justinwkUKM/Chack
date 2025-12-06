// components/onboarding-check.tsx

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

/**
 * Client-side component that checks onboarding status and redirects if needed
 * This is a fallback in case server-side checks don't work
 */
export function OnboardingCheck() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isOnboarded = useQuery(
    api.auth.isOnboarded,
    status === "authenticated" && session?.user?.id
      ? { userId: session.user.id }
      : "skip"
  );

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id && isOnboarded === false) {
      router.push("/onboarding");
    }
  }, [status, session, isOnboarded, router]);

  return null;
}

