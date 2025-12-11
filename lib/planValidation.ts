// lib/planValidation.ts

import { PLAN_LIMITS, PlanType } from "./stripe";

export interface PlanValidationResult {
  canCreate: boolean;
  reason?: string;
  requiresUpgrade?: boolean;
}

/**
 * Validate if an organization can create an assessment based on their plan
 */
export function validatePlanForAssessment(
  plan: string,
  credits: number,
  stripeStatus?: string
): PlanValidationResult {
  // Free plan validation
  if (plan === "free") {
    if (credits < 1) {
      return {
        canCreate: false,
        reason: "You've used all your free credits. Upgrade to Pro for more.",
        requiresUpgrade: true,
      };
    }
    return { canCreate: true };
  }

  // Pro plan validation
  if (plan === "pro") {
    // Check subscription status
    if (!stripeStatus || (stripeStatus !== "active" && stripeStatus !== "trialing")) {
      return {
        canCreate: false,
        reason: "Your Pro subscription is not active. Please update your payment method.",
        requiresUpgrade: false,
      };
    }

    if (credits < 1) {
      return {
        canCreate: false,
        reason: "You've used all your Pro credits. Your credits will renew next billing cycle.",
        requiresUpgrade: false,
      };
    }

    return { canCreate: true };
  }

  // Enterprise plan - unlimited
  if (plan === "enterprise") {
    return { canCreate: true };
  }

  // Unknown plan
  return {
    canCreate: false,
    reason: "Invalid plan. Please contact support.",
    requiresUpgrade: false,
  };
}

/**
 * Get plan limits for display
 */
export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as PlanType] || PLAN_LIMITS.free;
}

/**
 * Check if plan allows feature
 */
export function planAllowsFeature(plan: string, feature: string): boolean {
  const limits = getPlanLimits(plan);

  switch (feature) {
    case "advanced_scanning":
      return plan === "pro" || plan === "enterprise";
    case "authenticated_flows":
      return plan === "pro" || plan === "enterprise";
    case "priority_support":
      return plan === "pro" || plan === "enterprise";
    case "team_collaboration":
      return plan === "pro" || plan === "enterprise";
    case "unlimited_tests":
      return plan === "enterprise";
    default:
      return true; // Basic features available to all
  }
}

