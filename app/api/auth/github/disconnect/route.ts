import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ disconnected: true });

  // Secure cookie settings
  response.cookies.set("githubConnected", "false", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
  response.cookies.set("githubRepoCache", "", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });

  return response;
}
