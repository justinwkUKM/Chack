// lib/auth.ts

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // allow login
      return true;
    },
    async jwt({ token, account, user }) {
      // On first login, `account` exists; on subsequent, token is reused
      // token.sub is the user id from NextAuth
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.provider = token.provider as string;

        if (token.accessToken) {
          session.accessToken = token.accessToken as string;
        }
        
        // Fetch latest user data from Convex to get updated name
        try {
          const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
          if (convexUrl) {
            const convex = new ConvexHttpClient(convexUrl);
            const user = await convex.query(api.users.getById, { userId: token.sub });
            if (user) {
              // Update session with latest data from Convex
              session.user.name = user.name || session.user.name;
              session.user.email = user.email || session.user.email;
              session.user.image = user.image || session.user.image;
            }
          }
        } catch (error) {
          // If Convex query fails, use session data as fallback
          console.error("Failed to fetch user from Convex in session callback:", error);
        }
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

