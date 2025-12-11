// app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import Stripe from "stripe";
import { isStripeConfigured } from "@/lib/stripeConfig";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// TypeScript now knows webhookSecret is defined
const WEBHOOK_SECRET: string = webhookSecret || "";

// Check configuration at module load (non-blocking for graceful degradation)
if (!webhookSecret || !isStripeConfigured()) {
  console.warn("⚠️  Stripe webhook secret not configured. Webhook endpoint will return errors.");
}

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!isStripeConfigured() || !stripe || !WEBHOOK_SECRET) {
    console.error("Stripe webhook called but Stripe is not configured");
    return NextResponse.json(
      { error: "Webhook endpoint not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        
        if (!orgId) {
          console.error("No orgId in checkout session metadata");
          break;
        }

        // Get subscription details
        if (session.subscription && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          ) as Stripe.Subscription;

          // Update organization with subscription details
          await fetchMutation(api.subscriptions.updateFromStripe, {
            orgId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id,
            stripeStatus: subscription.status,
            stripeCurrentPeriodEnd: (subscription as any).current_period_end ? (subscription as any).current_period_end * 1000 : undefined,
            plan: "pro",
          });

          // Add credits for Pro plan (yearly subscription)
          await fetchMutation(api.credits.add, {
            orgId,
            amount: 1000,
            description: "Pro plan subscription - initial credits (yearly)",
            userId: session.metadata?.userId || "system",
          });

          // Log subscription event
          await fetchMutation(api.subscriptions.logSubscriptionEvent, {
            orgId,
            event: "subscription_created",
            stripeEventId: event.id,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            details: JSON.stringify({
              subscriptionId: subscription.id,
              status: subscription.status,
            }),
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (!orgId) {
          console.error("No orgId in subscription metadata");
          break;
        }

        await fetchMutation(api.subscriptions.updateFromStripe, {
          orgId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id,
          stripeStatus: subscription.status,
          stripeCurrentPeriodEnd: (subscription as any).current_period_end ? (subscription as any).current_period_end * 1000 : undefined,
        });

        await fetchMutation(api.subscriptions.logSubscriptionEvent, {
          orgId,
          event: "subscription_updated",
          stripeEventId: event.id,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
            details: JSON.stringify({
              status: subscription.status,
              currentPeriodEnd: (subscription as any).current_period_end || null,
            }),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (!orgId) {
          console.error("No orgId in subscription metadata");
          break;
        }

        // Downgrade to free plan
        await fetchMutation(api.subscriptions.updateFromStripe, {
          orgId,
          stripeSubscriptionId: subscription.id,
          stripeStatus: "canceled",
          plan: "free",
        });

        await fetchMutation(api.subscriptions.logSubscriptionEvent, {
          orgId,
          event: "subscription_canceled",
          stripeEventId: event.id,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          details: JSON.stringify({
            canceledAt: subscription.canceled_at,
          }),
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          const orgId = subscription.metadata?.orgId;

          if (orgId) {
            // Renew credits for Pro plan (yearly subscription)
            await fetchMutation(api.credits.add, {
              orgId,
              amount: 1000,
              description: "Pro plan renewal - yearly credits",
              userId: "system",
            });

            await fetchMutation(api.subscriptions.logSubscriptionEvent, {
              orgId,
              event: "payment_succeeded",
              stripeEventId: event.id,
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: invoice.customer as string,
              details: JSON.stringify({
                invoiceId: invoice.id,
                amount: invoice.amount_paid,
              }),
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          const orgId = subscription.metadata?.orgId;

          if (orgId) {
            await fetchMutation(api.subscriptions.logSubscriptionEvent, {
              orgId,
              event: "payment_failed",
              stripeEventId: event.id,
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: invoice.customer as string,
              details: JSON.stringify({
                invoiceId: invoice.id,
                amount: invoice.amount_due,
              }),
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

