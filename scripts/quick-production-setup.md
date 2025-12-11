# Quick Production Setup Guide

## Step-by-Step Instructions

### 1. Get Live Stripe API Keys

1. Visit: https://dashboard.stripe.com/apikeys
2. **Toggle to LIVE mode** (switch in top right corner)
3. Copy your **Live Secret Key** (starts with `sk_live_`)
4. Copy your **Live Publishable Key** (starts with `pk_live_`)

### 2. Switch Stripe CLI to Live Mode

```bash
# Replace sk_live_... with your actual live secret key
stripe config --set live_mode_api_key sk_live_YOUR_ACTUAL_KEY
```

Verify:
```bash
stripe config --list
# Should show: live_mode_api_key: sk_live_...
```

### 3. Create Production Product and Price

```bash
# Create yearly price ($49/year)
stripe prices create \
  --product-data-name="CHACK Pro" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring-interval=year
```

**Save the Price ID** from the output (starts with `price_`)

### 4. Set Up Production Webhook

1. Visit: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-production-domain.com/api/stripe/webhook`
   - Example: `https://chack.waqasobeidy.com/api/stripe/webhook`
4. **Description**: "CHACK Production Webhooks"
5. **Events to send**:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. Click **"Add endpoint"**
7. Click **"Reveal"** on the signing secret
8. Copy the **Signing secret** (starts with `whsec_`)

### 5. Set Production Environment Variables

#### For Vercel:

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings > Environment Variables**
4. Add:

```env
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_PRO_PRICE_ID=price_YOUR_PRODUCTION_PRICE_ID
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

5. Make sure **Environment** is set to **Production**
6. Click **"Save"**

#### For Other Platforms:

Add the same variables to your platform's environment settings.

### 6. Deploy to Production

```bash
# Push to main (if using Vercel auto-deploy)
git push origin main

# Or deploy manually
vercel --prod
```

### 7. Test Production Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select: `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check **"Logs"** tab for delivery status

### 8. Test Production Checkout

1. Visit your production site
2. Go to Settings > Plans
3. Click "Upgrade to Pro"
4. Use a test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify:
   - Subscription created in Stripe Dashboard
   - Credits added in your app
   - Webhook events received

## Production Checklist

- [ ] Stripe account in **LIVE mode**
- [ ] Live API keys obtained
- [ ] Stripe CLI switched to live mode
- [ ] Production price created
- [ ] Production webhook endpoint created
- [ ] Webhook signing secret obtained
- [ ] Environment variables set in hosting platform
- [ ] App deployed to production
- [ ] Webhook test successful
- [ ] Checkout flow tested

## Important Notes

⚠️ **Never use test keys in production!**
- Test mode: `sk_test_...` and `whsec_...` (test)
- Live mode: `sk_live_...` and `whsec_...` (production)

⚠️ **Webhook URL must be HTTPS**
- Must be publicly accessible
- Must use HTTPS (not HTTP)

✅ **Monitor First Payments**
- Watch Stripe Dashboard closely
- Check webhook logs
- Verify credits are added correctly

