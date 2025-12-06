// components/user-sync.tsx

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Component that syncs user data to Convex when they log in
 * This should be included in the layout or a page that's always rendered
 */
export function UserSync() {
  const { data: session, status } = useSession();
  const upsertUser = useMutation(api.users.upsert);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Sync user to Convex database
      upsertUser({
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.name || undefined,
        image: session.user.image || undefined,
        provider: session.user.provider || "unknown",
      }).catch((error) => {
        console.error("Failed to sync user to Convex:", error);
      });
    }
  }, [session, status, upsertUser]);

  // This component doesn't render anything
  return null;
}

