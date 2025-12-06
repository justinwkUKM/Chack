// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth({
  ...authOptions,
  pages: {
    signIn: "/auth/login",
    newUser: "/onboarding", // triggers first-time login redirect
  },
});

export { handler as GET, handler as POST };

