"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Settings, Sun, LogOut, UserCircle, Menu, X } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDark = theme === "dark";
  const isDashboardShell = ["/dashboard", "/projects", "/scans", "/reports", "/settings"].some(
    (path) => pathname?.startsWith(path)
  );
  const navContainerClasses = cn(
    "px-4 sm:px-6 lg:px-8",
    isDashboardShell ? "w-full" : "mx-auto max-w-7xl"
  );
  const navInnerClasses = cn(
    "flex h-16 items-center justify-between",
    isDashboardShell ? "" : "mx-auto max-w-7xl"
  );
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  const userImage = session?.user?.image;

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
        scrolled || mobileMenuOpen ? "bg-background/80 backdrop-blur-md border-border shadow-sm" : "bg-transparent"
      )}
    >
      <div className={navContainerClasses}>
        <div className={navInnerClasses}>
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="group flex items-center gap-2"
            >
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/20 transition-transform duration-300 group-hover:scale-105">
                <span className="text-lg font-bold text-white">C</span>
                <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-sky-500 group-hover:to-cyan-500 transition-all duration-300">
                CHACK
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {session && (
              <nav className="flex items-center gap-6 mr-4">
                <Link 
                  href="/dashboard" 
                  className={cn(
                    "text-sm font-medium transition-colors relative",
                    pathname === "/dashboard" 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Dashboard
                  {pathname === "/dashboard" && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full" />
                  )}
                </Link>
                <Link 
                  href="/dashboard" 
                  className={cn(
                    "text-sm font-medium transition-colors relative",
                    pathname?.startsWith("/projects") 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Projects
                  {pathname?.startsWith("/projects") && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full" />
                  )}
                </Link>
              </nav>
            )}

            <div className="h-6 w-px bg-border/50" />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="relative p-2 rounded-full hover:bg-muted transition-colors duration-200 group"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Moon className="h-5 w-5 text-muted-foreground group-hover:text-sky-400 transition-colors" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                )}
              </button>

              {status === "loading" ? (
                <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
              ) : session ? (
                <div className="flex items-center gap-3 pl-2">
                  <div className="hidden lg:flex flex-col items-end mr-2">
                    <span className="text-sm font-medium leading-none text-foreground">{displayName}</span>
                    <span className="text-xs text-muted-foreground mt-1">{displayEmail}</span>
                  </div>
                  
                  <div className="relative group">
                    <button className="relative h-9 w-9 rounded-full overflow-hidden border border-border shadow-sm transition-transform group-hover:scale-105 ring-2 ring-transparent group-hover:ring-sky-500/30">
                      {userImage ? (
                        <Image
                          src={userImage}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          width={36}
                          height={36}
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-900 dark:to-cyan-900 flex items-center justify-center text-sky-700 dark:text-sky-300 font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border bg-card p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Account
                      </div>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <div className="my-1 h-px bg-border" />
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="relative inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-all hover:bg-foreground/90 hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-slide-up">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {session ? (
              <>
                <div className="flex items-center gap-3 px-3 py-3 mb-2 border-b border-border">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-900 dark:to-cyan-900 flex items-center justify-center text-sky-700 dark:text-sky-300 font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{displayName}</div>
                    <div className="text-xs text-muted-foreground">{displayEmail}</div>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className={cn(
                    "block rounded-lg px-3 py-2 text-base font-medium transition-colors",
                    pathname === "/dashboard"
                      ? "text-foreground bg-secondary"
                      : "text-foreground hover:bg-secondary"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(
                    "block rounded-lg px-3 py-2 text-base font-medium transition-colors",
                    pathname?.startsWith("/projects")
                      ? "text-foreground bg-secondary"
                      : "text-foreground hover:bg-secondary"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Projects
                </Link>
                <Link
                  href="/settings"
                  className={cn(
                    "block rounded-lg px-3 py-2 text-base font-medium transition-colors",
                    pathname === "/settings"
                      ? "text-foreground bg-secondary"
                      : "text-foreground hover:bg-secondary"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block w-full text-left rounded-lg px-3 py-2 text-base font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block rounded-lg bg-primary/10 px-3 py-2 text-base font-medium text-primary hover:bg-primary/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
