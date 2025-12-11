# Stripe CLI Setup Commands

## Prerequisites
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`

## Quick Setup Commands

### 1. Create Product and Price
```bash
stripe prices create \
  --product-data-name="CHACK Pro" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring-interval=month
```

**Output:** Look for `"id": "price_1Qxyz..."` - that's your `STRIPE_PRO_PRICE_ID`

### 2. Get Webhook Secret (Local Development)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Output:** Look for `Your webhook signing secret is whsec_...` - that's your `STRIPE_WEBHOOK_SECRET`

### 3. Get Stripe Secret Key
Visit: https://dashboard.stripe.com/test/apikeys
Copy the **Secret key** (starts with `sk_test_...`) - that's your `STRIPE_SECRET_KEY`

## Update .env.local

After running the commands above, update your `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_... (from Dashboard)
STRIPE_PRO_PRICE_ID=price_... (from CLI command)
STRIPE_WEBHOOK_SECRET=whsec_... (from 'stripe listen' command)
```

## Production Setup

For production (Vercel), create a webhook endpoint:

```bash
stripe webhook_endpoints create \
  --url="https://your-domain.com/api/stripe/webhook" \
  --enabled-events="checkout.session.completed,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed"
```

Then get the secret from: https://dashboard.stripe.com/webhooks
