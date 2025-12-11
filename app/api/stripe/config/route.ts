// app/api/stripe/config/route.ts

import { NextResponse } from "next/server";
import { checkStripeConfig } from "@/lib/stripeConfig";

export async function GET() {
  const config = checkStripeConfig();
  
  return NextResponse.json({
    configured: config.configured,
    missing: config.missing,
    message: config.configured
      ? "Stripe is configured"
      : `Stripe not configured. Missing: ${config.missing.join(", ")}`,
  });
}

