// app/api/stripe/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { isStripeConfigured } from "@/lib/stripeConfig";

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Payment processing is not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const orgs = await fetchQuery(api.organizations.listByUser, {
      userId: session.user.id,
    });
    const org = orgs.find((o) => o._id === orgId);
    
    if (!org || org.role !== "owner") {
      return NextResponse.json(
        { error: "You must be the owner to upgrade" },
        { status: 403 }
      );
    }

    // Get or create Stripe customer
    let customerId: string;
    const orgData = await fetchQuery(api.organizations.get, { orgId });
    
    // Check if Stripe customer ID exists (using type-safe property check)
    if (orgData && "stripeCustomerId" in orgData && orgData.stripeCustomerId) {
      customerId = orgData.stripeCustomerId as string;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
          orgId: orgId,
        },
      });
      customerId = customer.id;

      // Save customer ID to organization
      await fetchMutation(api.subscriptions.updateFromStripe, {
        orgId,
        stripeCustomerId: customerId,
      });
    }

    // Create Stripe Checkout Session
    const sessionUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PRICE_IDS.pro,
          quantity: 1,
        },
      ],
      success_url: `${sessionUrl}/settings?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
      cancel_url: `${sessionUrl}/settings?upgrade=canceled`,
      metadata: {
        orgId: orgId,
        userId: session.user.id,
      },
      subscription_data: {
        metadata: {
          orgId: orgId,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

