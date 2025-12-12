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
        token.tokenType = account.token_type;
        token.tokenExpiresAt = account.expires_at
          ? account.expires_at * 1000
          : undefined;
        token.githubAccountId = account.providerAccountId;
        token.githubUsername =
          (account as any).login || (account as any).username || undefined;
        token.githubScopes = typeof account.scope === "string"
          ? account.scope.split(/[,\s]+/).filter(Boolean)
          : account.scope;
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
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        const userId = token.sub;
        try {
          if (convexUrl && userId) {
            // Use Promise.race to add a timeout
            const queryPromise = (async () => {
            const convex = new ConvexHttpClient(convexUrl);
              return await convex.query(api.users.getById, { userId });
            })();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Convex query timeout")), 5000)
            );
            
            const user = await Promise.race([queryPromise, timeoutPromise]) as any;
            if (user) {
              // Update session with latest data from Convex
              session.user.name = user.name || session.user.name;
              session.user.email = user.email || session.user.email;
              session.user.image = user.image || session.user.image;
            }
          }
        } catch (error) {
          // If Convex query fails, use session data as fallback
          // Only log if it's not a timeout (to reduce noise)
          if (error instanceof Error && !error.message.includes("timeout") && !error.message.includes("Connect Timeout")) {
          console.error("Failed to fetch user from Convex in session callback:", error);
          }
        }

        // Persist GitHub token metadata for downstream API calls
        if (token.provider === "github" && token.accessToken && userId) {
          try {
            const scopes = Array.isArray(token.githubScopes)
              ? (token.githubScopes as string[])
              : typeof token.githubScopes === "string"
                ? token.githubScopes.split(/[,\s]+/).filter(Boolean)
                : [];

            if (convexUrl) {
              // Use Promise.race to add a timeout
              const mutationPromise = (async () => {
              const convex = new ConvexHttpClient(convexUrl);
                return await convex.mutation(api.users.upsert, {
                  id: userId,
                email: session.user.email || "",
                name: session.user.name || undefined,
                image: session.user.image || undefined,
                provider: "github",
                githubAccountId: token.githubAccountId as string | undefined,
                githubUsername: token.githubUsername as string | undefined,
                githubScopes: scopes,
                githubAccessToken: token.accessToken as string,
                githubTokenType: token.tokenType as string | undefined,
                githubTokenExpiresAt: token.tokenExpiresAt as number | undefined,
              });
              })();
              
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Convex mutation timeout")), 5000)
              );
              
              await Promise.race([mutationPromise, timeoutPromise]);
            }
          } catch (error) {
            // Only log if it's not a timeout (to reduce noise)
            // The token will be saved via the OAuth callback route anyway
            if (error instanceof Error && !error.message.includes("timeout") && !error.message.includes("Connect Timeout")) {
            console.error("Failed to persist GitHub token metadata:", error);
            }
          }
        }
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

