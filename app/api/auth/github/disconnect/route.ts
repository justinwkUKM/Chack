import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ disconnected: true });

  response.cookies.set("githubConnected", "false", {
    path: "/",
    httpOnly: false,
  });
  response.cookies.set("githubRepoCache", "", {
    path: "/",
    httpOnly: false,
    maxAge: 0,
  });

  return response;
}
