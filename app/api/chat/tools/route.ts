// app/api/chat/tools/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { toolName, args } = await req.json();

    if (toolName === "getOrganizationInfo") {
      const orgInfo = await fetchQuery(api.organizations.getOrgInfoForChat, {
        userId: session.user.id,
      });

      if (!orgInfo) {
        return NextResponse.json({
          success: false,
          message: "No organization found. Please complete onboarding first.",
        });
      }

      return NextResponse.json({
        success: true,
        data: orgInfo,
      });
    }

    return NextResponse.json(
      { error: "Unknown tool" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Tool execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute tool" },
      { status: 500 }
    );
  }
}

