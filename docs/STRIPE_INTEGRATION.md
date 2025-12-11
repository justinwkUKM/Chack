# Stripe Integration Guide

This document describes the Stripe payment integration for CHACK, enabling Pro plan subscriptions.

## Overview

CHACK supports three plans:
- **Free**: Default plan with 10 credits
- **Pro**: $49/month subscription via Stripe with 1,000 credits
- **Enterprise**: Custom pricing (contact sales)

## Architecture

### Database Schema

The `organizations` table has been extended with Stripe fields:
- `stripeCustomerId`: Stripe customer ID
- `stripeSubscriptionId`: Active subscription ID
- `stripePriceId`: Price ID for the subscription
- `stripeStatus`: Subscription status (active, canceled, past_due, etc.)
- `stripeCurrentPeriodEnd`: Unix timestamp of subscription renewal

A new `subscriptionEvents` table tracks all subscription-related events for audit logging.

### API Routes

1. **`/api/stripe/checkout`** (POST)
   - Creates Stripe Checkout session for Pro plan upgrade
   - Creates or retrieves Stripe customer
   - Returns checkout URL

2. **`/api/stripe/webhook`** (POST)
   - Handles Stripe webhook events
   - Updates subscription status in database
   - Manages credit allocation on payment success

3. **`/api/stripe/portal`** (POST)
   - Creates Stripe Customer Portal session
   - Allows users to manage billing, update payment methods, cancel subscriptions

### Convex Functions

**`convex/subscriptions.ts`**:
- `getSubscription`: Get subscription details for an organization
- `hasActiveProSubscription`: Check if Pro subscription is active
- `updateFromStripe`: Update subscription from webhook
- `logSubscriptionEvent`: Log subscription events
- `cancelSubscription`: Cancel subscription (downgrade to free)

## Setup Instructions

### 1. Stripe Account Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Dashboard
3. Create a Product and Price for the Pro plan:
   - Product: "CHACK Pro"
   - Price: $49/month (recurring)
   - Copy the Price ID (starts with `price_`)

### 2. Environment Variables

Add to `.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
```

**For Production:**
- Use `sk_live_...` for `STRIPE_SECRET_KEY`
- Create a new webhook endpoint in Stripe Dashboard
- Copy the webhook signing secret

### 3. Webhook Configuration

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Deploy Convex Schema

Run Convex to update the schema:

```bash
npx convex dev
```

This will:
- Add Stripe fields to `organizations` table
- Create `subscriptionEvents` table
- Generate TypeScript types

## User Flow

### Free to Pro Upgrade

1. User clicks "Upgrade to Pro" in Settings
2. Frontend calls `/api/stripe/checkout` with `orgId`
3. API creates/retrieves Stripe customer
4. Creates Checkout session
5. User redirected to Stripe Checkout
6. After payment, Stripe webhook:
   - Updates organization plan to "pro"
   - Sets subscription status to "active"
   - Adds 1,000 credits
   - Logs subscription event
7. User redirected back to Settings with success message

### Subscription Management

1. User clicks "Manage Billing" in Settings (Pro users only)
2. Frontend calls `/api/stripe/portal` with `orgId`
3. User redirected to Stripe Customer Portal
4. Can update payment method, view invoices, cancel subscription

### Subscription Cancellation

1. User cancels in Stripe Customer Portal
2. Stripe webhook receives `customer.subscription.deleted`
3. Organization plan set to "free"
4. Subscription status set to "canceled"
5. Existing credits remain (no refund)

### Payment Renewal

1. Monthly payment succeeds
2. Stripe webhook receives `invoice.payment_succeeded`
3. 1,000 credits added to organization
4. Subscription status remains "active"

## Business Logic

### Plan Validation

- **Free Plan**: 
  - 10 credits included
  - No subscription required
  - Can create assessments if credits > 0

- **Pro Plan**:
  - Requires active Stripe subscription (`stripeStatus === "active"` or `"trialing"`)
  - 1,000 credits included
  - Credits renew monthly on payment success
  - Assessment creation blocked if subscription not active

- **Enterprise Plan**:
  - No Stripe subscription (custom billing)
  - Unlimited credits
  - All features enabled

### Credit System

- Each assessment costs 1 credit
- Credits deducted before assessment creation
- Free plan: 10 credits (one-time)
- Pro plan: 1,000 credits (renewed monthly)
- Enterprise: Unlimited (no deduction)

### Assessment Creation Validation

The `assessments.create` mutation validates:
1. Organization exists
2. Pro plan has active subscription (if plan === "pro")
3. Sufficient credits available
4. Deducts 1 credit on success

## Error Handling

### Common Errors

1. **"Insufficient credits"**
   - User has 0 credits
   - Solution: Upgrade to Pro or wait for renewal

2. **"Your Pro subscription is not active"**
   - Pro plan but subscription expired/canceled
   - Solution: Update payment method in Stripe Portal

3. **"Failed to create checkout session"**
   - Stripe API error
   - Check Stripe Dashboard for details

### Error Messages

All errors are user-friendly and include:
- Clear description of the issue
- Suggested action
- Link to relevant page (Settings, etc.)

## Testing

### Test Mode

1. Use Stripe test mode keys (`sk_test_...`)
2. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Test webhooks using Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Test Scenarios

1. **Upgrade Flow**:
   - Free user upgrades to Pro
   - Verify subscription created
   - Verify credits added
   - Verify plan updated

2. **Payment Failure**:
   - Simulate payment failure
   - Verify subscription status updated
   - Verify user notified

3. **Cancellation**:
   - Cancel subscription
   - Verify plan downgraded to free
   - Verify credits remain

4. **Renewal**:
   - Simulate monthly renewal
   - Verify credits added
   - Verify subscription remains active

## Security

### Webhook Security

- All webhooks verified using Stripe signature
- Invalid signatures rejected
- Webhook secret stored in environment variables

### Access Control

- Only organization owners can upgrade/manage billing
- User authentication required for all API routes
- Organization membership verified before operations

### Data Protection

- Stripe customer IDs stored (not payment details)
- Payment information handled by Stripe
- PCI compliance maintained by Stripe

## Monitoring

### Subscription Events

All subscription events logged to `subscriptionEvents` table:
- `subscription_created`
- `subscription_updated`
- `subscription_canceled`
- `payment_succeeded`
- `payment_failed`

### Dashboard

View subscription status in:
- Settings > Plans tab
- Shows current plan, subscription status, renewal date
- "Manage Billing" button for Pro users

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` matches
3. Check server logs for errors
4. Use Stripe CLI to test locally

### Subscription Not Updating

1. Check webhook logs in Stripe Dashboard
2. Verify webhook handler is processing events
3. Check Convex logs for errors
4. Manually trigger webhook from Stripe Dashboard

### Credits Not Added

1. Check `invoice.payment_succeeded` webhook received
2. Verify credits mutation executed
3. Check credit transaction history
4. Verify organization credits updated

## Future Enhancements

- [ ] Annual billing option
- [ ] Usage-based pricing
- [ ] Team member limits per plan
- [ ] Custom enterprise features
- [ ] Subscription analytics dashboard
- [ ] Email notifications for payment events

