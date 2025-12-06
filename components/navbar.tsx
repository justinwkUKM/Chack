// components/navbar.tsx

"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Settings } from "lucide-react";

export function Navbar() {
  const { data: session, status } = useSession();
  
  // Get user data from Convex database for real-time updates
  const user = useQuery(
    api.users.getById,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  const getProviderName = (provider?: string) => {
    if (!provider) return "Unknown";
    return provider === "google" ? "Google" : provider === "github" ? "GitHub" : provider;
  };
  
  // Prioritize Convex user data (always up-to-date), fallback to session only if Convex is loading
  const displayName = user ? (user.name || user.email || "") : (session?.user?.name || session?.user?.email || "");
  const displayEmail = user ? (user.email || "") : (session?.user?.email || "");
  const displayProvider = user ? user.provider : session?.user?.provider;

  return (
    <nav className="glass-effect border-b border-gray-200 sticky top-0 z-50 animate-fade-in bg-white backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-xl font-display font-semibold bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent hover:from-sky-300 hover:to-cyan-300 transition-all duration-300"
            >
              CHACK
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {status === "loading" ? (
              <div className="text-sm text-gray-700">Loading...</div>
            ) : session ? (
              <>
                <div className="flex items-center gap-3">
                  <Link
                    href="/settings"
                    className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 hover:scale-110 group"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-800 group-hover:text-sky-500 transition-colors duration-300" />
                  </Link>
                  <div className="text-right animate-fade-in">
                    <div className="text-sm font-medium text-black font-display">
                      {displayName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>{displayEmail}</span>
                      {displayProvider && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="capitalize text-gray-500">
                            {getProviderName(displayProvider)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200 hover:scale-105 transition-all duration-300 border border-gray-300"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

