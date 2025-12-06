// app/actions/onboarding.ts

"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function checkOnboarding(userId: string): Promise<boolean> {
  if (!convexUrl) {
    console.warn("NEXT_PUBLIC_CONVEX_URL is not set, assuming not onboarded");
    return false;
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = await convex.query(api.auth.isOnboarded, { userId });
    return result ?? false;
  } catch (error) {
    console.error("Error checking onboarding:", error);
    // On error, assume not onboarded to be safe (will redirect to onboarding)
    return false;
  }
}

