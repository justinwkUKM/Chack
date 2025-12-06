// components/theme-provider.tsx

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  const user = useQuery(
    api.users.getById,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );
  const updateTheme = useMutation(api.users.updateTheme);

  // Initialize theme immediately on mount to prevent flash
  useEffect(() => {
    // First, check localStorage for immediate theme
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(storedTheme);
    } else {
      // Default to dark if no preference
      const defaultTheme: Theme = "dark";
      setThemeState(defaultTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(defaultTheme);
    }
    setMounted(true);
  }, []);

  // Update theme when user data loads
  useEffect(() => {
    if (mounted && user?.theme) {
      const userTheme = user.theme as Theme;
      setThemeState(userTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(userTheme);
      localStorage.setItem("theme", userTheme);
    }
  }, [user, mounted]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    localStorage.setItem("theme", newTheme);

    // Save to database if user is logged in
    if (session?.user?.id) {
      try {
        await updateTheme({ userId: session.user.id, theme: newTheme });
      } catch (error) {
        console.error("Failed to save theme preference:", error);
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Always provide context, even when not mounted (to prevent errors)
  // The theme will be set correctly once mounted
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

