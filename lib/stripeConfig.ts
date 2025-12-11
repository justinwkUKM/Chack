// lib/stripeConfig.ts

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRO_PRICE_ID &&
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Check if Stripe is configured (client-side safe)
 * Returns false if any required env vars are missing
 */
export function checkStripeConfig(): {
  configured: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  if (!process.env.STRIPE_SECRET_KEY) {
    missing.push("STRIPE_SECRET_KEY");
  }
  
  if (!process.env.STRIPE_PRO_PRICE_ID) {
    missing.push("STRIPE_PRO_PRICE_ID");
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    missing.push("STRIPE_WEBHOOK_SECRET");
  }
  
  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * Get Stripe configuration status for client components
 * Note: Client components can't access process.env directly for server vars
 * This should be called from a server component or API route
 */
export async function getStripeConfigStatus(): Promise<{
  configured: boolean;
  missing: string[];
  message?: string;
}> {
  const config = checkStripeConfig();
  
  if (!config.configured) {
    return {
      ...config,
      message: `Stripe is not configured. Missing: ${config.missing.join(", ")}. Pro plan upgrades are disabled.`,
    };
  }
  
  return {
    ...config,
    message: "Stripe is configured. Pro plan upgrades are available.",
  };
}

