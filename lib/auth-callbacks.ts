// lib/auth-callbacks.ts

import { ConvexHttpClient } from "convex/browser";
import type { NextAuthOptions } from "next-auth";
import { api } from "../convex/_generated/api.js";

export const authCallbacks: NextAuthOptions["callbacks"] = {
  async signIn() {
    return true;
  },
  async jwt({ token, account }) {
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
      session.accessToken = token.accessToken as string | undefined;

      try {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (convexUrl) {
          const convex = new ConvexHttpClient(convexUrl);
          const user = await convex.query(api.users.getById, { userId: token.sub });
          if (user) {
            session.user.name = user.name || session.user.name;
            session.user.email = user.email || session.user.email;
            session.user.image = user.image || session.user.image;
          }
        }
      } catch (error) {
        console.error("Failed to fetch user from Convex in session callback:", error);
      }
    }
    return session;
  },
};
