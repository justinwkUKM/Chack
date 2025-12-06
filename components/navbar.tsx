// components/navbar.tsx

"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Navbar() {
  const { data: session, status } = useSession();

  const getProviderName = (provider?: string) => {
    if (!provider) return "Unknown";
    return provider === "google" ? "Google" : provider === "github" ? "GitHub" : provider;
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-slate-100">
              Pentest Platform
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {status === "loading" ? (
              <div className="text-sm text-slate-400">Loading...</div>
            ) : session ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-100">
                      {session.user?.name || session.user?.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{session.user?.email}</span>
                      {session.user?.provider && (
                        <>
                          <span>•</span>
                          <span className="capitalize">
                            {getProviderName(session.user.provider)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition-colors"
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

