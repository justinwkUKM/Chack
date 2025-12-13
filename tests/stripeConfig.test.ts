import { describe, expect, it } from "@jest/globals";
import { checkStripeConfig, getStripeConfigStatus, isStripeConfigured } from "../lib/stripeConfig";

describe("isStripeConfigured", () => {
  it("returns false when env vars missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRO_PRICE_ID;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(isStripeConfigured()).toBe(false);
  });

  it("returns true when all env vars are present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRO_PRICE_ID = "price_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc";
    expect(isStripeConfigured()).toBe(true);
  });
});

describe("checkStripeConfig", () => {
  it("identifies missing keys", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    delete process.env.STRIPE_PRO_PRICE_ID;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const result = checkStripeConfig();
    expect(result.configured).toBe(false);
    expect(result.missing).toContain("STRIPE_PRO_PRICE_ID");
    expect(result.missing).toContain("STRIPE_WEBHOOK_SECRET");
  });
});

describe("getStripeConfigStatus", () => {
  it("returns descriptive message for missing config", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRO_PRICE_ID;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const result = await getStripeConfigStatus();
    expect(result.configured).toBe(false);
    expect(result.message).toMatch(/Stripe is not configured/);
    expect(result.missing).toContain("STRIPE_SECRET_KEY");
  });

  it("returns success message when configured", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRO_PRICE_ID = "price_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc";

    const result = await getStripeConfigStatus();
    expect(result.configured).toBe(true);
    expect(result.message).toMatch(/Stripe is configured/);
  });
});
