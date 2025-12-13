import { describe, expect, it } from "@jest/globals";
import {
  getPlanLimits,
  planAllowsFeature,
  validatePlanForAssessment,
} from "../lib/planValidation";

describe("validatePlanForAssessment", () => {
  it("blocks free users without credits", () => {
    const result = validatePlanForAssessment("free", 0);
    expect(result).toEqual({
      canCreate: false,
      reason: "You've used all your free credits. Upgrade to Pro for more.",
      requiresUpgrade: true,
    });
  });

  it("allows free users with credits", () => {
    expect(validatePlanForAssessment("free", 5)).toEqual({ canCreate: true });
  });

  it("blocks pro users with inactive subscription", () => {
    const result = validatePlanForAssessment("pro", 10, "canceled");
    expect(result).toEqual({
      canCreate: false,
      reason: "Your Pro subscription is not active. Please update your payment method.",
      requiresUpgrade: false,
    });
  });

  it("blocks pro users without credits", () => {
    const result = validatePlanForAssessment("pro", 0, "active");
    expect(result).toEqual({
      canCreate: false,
      reason: "You've used all your Pro credits. Your credits will renew next billing cycle.",
      requiresUpgrade: false,
    });
  });

  it("allows enterprise users regardless of credits", () => {
    expect(validatePlanForAssessment("enterprise", 0)).toEqual({ canCreate: true });
  });

  it("rejects unknown plans", () => {
    const result = validatePlanForAssessment("unknown", 5);
    expect(result.canCreate).toBe(false);
    expect(result.reason).toMatch(/Invalid plan/);
  });
});

describe("planAllowsFeature", () => {
  it("exposes advanced features correctly", () => {
    expect(planAllowsFeature("free", "advanced_scanning")).toBe(false);
    expect(planAllowsFeature("pro", "advanced_scanning")).toBe(true);
    expect(planAllowsFeature("enterprise", "advanced_scanning")).toBe(true);
  });

  it("handles unlimited tests flag", () => {
    expect(planAllowsFeature("pro", "unlimited_tests")).toBe(false);
    expect(planAllowsFeature("enterprise", "unlimited_tests")).toBe(true);
  });

  it("defaults to allowing unknown features", () => {
    expect(planAllowsFeature("free", "mystery" as any)).toBe(true);
  });
});

describe("getPlanLimits", () => {
  it("returns limits for known plans", () => {
    expect(getPlanLimits("pro").name).toBe("Pro");
  });

  it("falls back to free for unknown plans", () => {
    expect(getPlanLimits("unknown")).toEqual(getPlanLimits("free"));
  });
});
