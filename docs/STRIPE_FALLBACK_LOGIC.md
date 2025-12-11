# Stripe Fallback Logic & Error Detection

This document describes the error detection and fallback logic implemented when Stripe is not configured.

## Overview

When Stripe environment variables are missing or misconfigured, the application gracefully degrades to a free-only mode, disabling Pro plan upgrades while maintaining full functionality for free plan users.

## Configuration Detection

### Utility Functions (`lib/stripeConfig.ts`)

- **`isStripeConfigured()`**: Checks if all required Stripe environment variables are present
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRO_PRICE_ID`
  - `STRIPE_WEBHOOK_SECRET`

- **`checkStripeConfig()`**: Returns detailed configuration status with missing variables list

- **`getStripeConfigStatus()`**: Async function for server components to check configuration

### API Endpoint (`/api/stripe/config`)

Returns JSON response with:
```json
{
  "configured": boolean,
  "missing": string[],
  "message": string
}
```

## Fallback Behavior

### 1. Settings Page (`components/settings-content.tsx`)

**When Stripe is NOT configured:**
- Pro plan upgrade button is **disabled**
- Button text changes to "Unavailable"
- Warning message displayed: "⚠️ Pro plan unavailable (Stripe not configured)"
- Tooltip shows: "Stripe payment processing is not configured"
- `handlePlanChange("pro")` returns early with error toast
- `handleManageBilling()` returns early with error toast

**When Stripe IS configured:**
- All Pro plan features work normally
- Upgrade button enabled and functional
- Billing portal accessible

### 2. Homepage Pricing Section (`app/page.tsx`)

**When Stripe is NOT configured:**
- Pro plan card shows reduced opacity (60%)
- "Most Popular" badge hidden
- Warning banner displayed: "⚠️ Currently unavailable (Payment processing not configured)"
- "Start Free Trial" button disabled and grayed out
- Button text changes to "Unavailable"
- Click prevented with tooltip

**When Stripe IS configured:**
- Full Pro plan card styling
- All features visible and functional
- "Start Free Trial" button works normally

### 3. API Routes

#### `/api/stripe/checkout` (POST)
- **503 Service Unavailable** if Stripe not configured
- Error message: "Payment processing is not configured. Please contact support."
- Validates Stripe client before creating checkout session

#### `/api/stripe/portal` (POST)
- **503 Service Unavailable** if Stripe not configured
- Error message: "Payment processing is not configured. Please contact support."
- Validates Stripe client before creating portal session

#### `/api/stripe/webhook` (POST)
- **503 Service Unavailable** if Stripe not configured
- Error message: "Webhook endpoint not configured"
- Logs warning at module load if misconfigured
- Gracefully handles webhook calls when not configured

### 4. Assessment Creation (`convex/assessments.ts`)

**Plan Validation:**
- Free plan users: Can create assessments if they have credits
- Pro plan users: Must have active Stripe subscription (`stripeStatus === "active"` or `"trialing"`)
- Error thrown if Pro user's subscription is inactive
- Credits are validated before assessment creation

**No Stripe Required:**
- Free plan works independently of Stripe
- Assessment creation logic doesn't require Stripe for free users
- Only Pro plan upgrades require Stripe

### 5. Stripe Library (`lib/stripe.ts`)

**Graceful Degradation:**
- Logs warnings instead of throwing errors during build
- Returns `null` if `STRIPE_SECRET_KEY` is missing
- Checks configuration status and logs warnings
- Runtime errors only occur when Stripe is actually used

## Error Messages

### User-Facing Messages

1. **Settings Page:**
   - "Pro plan upgrades are currently unavailable. Please contact support."
   - "Billing management is currently unavailable. Please contact support."
   - "Payment processing is not configured. Please contact support."

2. **Homepage:**
   - "⚠️ Currently unavailable (Payment processing not configured)"
   - Tooltip: "Pro plan upgrades are currently unavailable"

3. **API Errors:**
   - 503 responses with clear error messages
   - Client-side error handling displays user-friendly messages

### Developer/Console Messages

- `⚠️ STRIPE_SECRET_KEY is not set - Stripe features will not work`
- `⚠️ Stripe is not fully configured - Pro plan upgrades will be disabled`
- `⚠️ Stripe webhook secret not configured. Webhook endpoint will return errors.`
- `Stripe webhook called but Stripe is not configured`

## Testing Fallback Logic

### Test Scenarios

1. **Missing All Stripe Variables:**
   ```bash
   # Remove from .env.local:
   # STRIPE_SECRET_KEY
   # STRIPE_PRO_PRICE_ID
   # STRIPE_WEBHOOK_SECRET
   ```
   - Settings: Pro button disabled
   - Homepage: Pro card grayed out
   - API routes: Return 503 errors

2. **Missing Only STRIPE_SECRET_KEY:**
   - Same behavior as missing all

3. **Missing Only STRIPE_PRO_PRICE_ID:**
   - Same behavior as missing all

4. **Missing Only STRIPE_WEBHOOK_SECRET:**
   - Pro upgrades work
   - Webhook endpoint returns 503
   - Subscription renewals won't work automatically

5. **All Variables Present:**
   - Full functionality
   - Pro plan upgrades work
   - Webhooks process correctly

## Environment Variables

### Required for Pro Plan:
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_PRO_PRICE_ID` - Stripe Price ID for Pro plan
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

### Optional:
- `NEXT_PUBLIC_APP_URL` - Used for redirect URLs
- `NEXTAUTH_URL` - Fallback for redirect URLs

## Best Practices

1. **Always check configuration before using Stripe:**
   ```typescript
   if (!isStripeConfigured()) {
     // Handle gracefully
   }
   ```

2. **Provide clear user feedback:**
   - Show warnings when features are unavailable
   - Disable buttons rather than showing errors after click
   - Use tooltips to explain why features are disabled

3. **Log warnings, don't throw errors:**
   - Allow application to run in free-only mode
   - Log configuration issues for debugging
   - Only throw errors when Stripe is actually used

4. **Test both scenarios:**
   - With Stripe configured (full functionality)
   - Without Stripe configured (free-only mode)

## Migration Path

When moving from development to production:

1. Set up Stripe account
2. Create product and price
3. Configure webhook endpoint
4. Add environment variables
5. Test Pro plan upgrades
6. Verify webhook processing

The application will automatically enable Pro plan features once all environment variables are configured.

