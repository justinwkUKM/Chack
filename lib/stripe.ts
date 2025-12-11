// lib/stripe.ts

import Stripe from "stripe";

// Only throw error at runtime, not during build
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is not set - Stripe features will not work");
  }
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    })
  : (null as any); // Will fail at runtime if used without key

// Stripe Price IDs - Set these in your Stripe Dashboard
// For testing, use test mode price IDs
export const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID || "price_test_pro", // Replace with your actual price ID
} as const;

// Plan limits
export const PLAN_LIMITS = {
  free: {
    name: "Free",
    price: 0,
    credits: 10,
    testsPerMonth: 10,
    features: [
      "Basic vulnerability scanning",
      "OWASP Top 10 coverage",
      "Community support",
    ],
  },
  pro: {
    name: "Pro",
    price: 49,
    credits: 1000,
    testsPerMonth: 1000,
    billingInterval: "year",
    features: [
      "1,000 tests per month",
      "Advanced vulnerability scanning",
      "Authenticated flow testing",
      "Priority email support",
      "Team collaboration",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: null, // Custom pricing
    credits: null, // Unlimited
    testsPerMonth: null, // Unlimited
    features: [
      "Unlimited tests",
      "Custom integrations",
      "Advanced compliance tools",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

