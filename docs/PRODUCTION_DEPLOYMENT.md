# Production Deployment Guide

This guide covers deploying CHACK to production with Stripe live payments.

## Prerequisites

1. ✅ Stripe account with live mode enabled
2. ✅ Production domain configured
3. ✅ Environment variables set up
4. ✅ Stripe CLI installed

## Step 1: Switch Stripe to Live Mode

### Get Live API Keys

1. Visit: https://dashboard.stripe.com/apikeys
2. Make sure you're in **Live mode** (toggle in top right)
3. Copy your **Publishable key** (starts with `pk_live_`)
4. Copy your **Secret key** (starts with `sk_live_`)

⚠️ **Important**: Never commit live keys to git!

### Switch Stripe CLI to Live Mode

```bash
# Get your live secret key from dashboard
stripe config --set live_mode_api_key sk_live_YOUR_LIVE_KEY
```

Verify:
```bash
stripe config --list
# Should show: live_mode_api_key: sk_live_...
```

## Step 2: Create Production Product and Price

### Option A: Using the Setup Script

```bash
./scripts/setup-stripe-production.sh
```

### Option B: Manual CLI Commands

```bash
# Create product
stripe products create --name="CHACK Pro"

# Create yearly price ($49/year)
stripe prices create \
  --product="prod_YOUR_PRODUCT_ID" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring-interval=year
```

**Save the Price ID** (starts with `price_`) - this is your `STRIPE_PRO_PRICE_ID`

## Step 3: Set Up Production Webhook

### Create Webhook Endpoint

1. Visit: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-production-domain.com/api/stripe/webhook`
   - Example: `https://chack.waqasobeidy.com/api/stripe/webhook`
4. **Description**: "CHACK Production Webhooks"
5. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **"Add endpoint"**

### Get Webhook Signing Secret

1. Click on the webhook endpoint you just created
2. Find **"Signing secret"**
3. Click **"Reveal"** and copy the secret (starts with `whsec_`)
4. This is your `STRIPE_WEBHOOK_SECRET`

## Step 4: Configure Production Environment Variables

### For Vercel (Recommended)

1. Go to your Vercel project: https://vercel.com/dashboard
2. Navigate to **Settings > Environment Variables**
3. Add the following:

```env
# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PRO_PRICE_ID=price_YOUR_PRODUCTION_PRICE_ID
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Other required variables
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-secret
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_CONVEX_URL=your-production-convex-url
# ... other env vars
```

4. **Important**: Make sure to select the correct **Environment** (Production, Preview, Development)
5. Click **"Save"**

### For Other Platforms

Add the same environment variables to your hosting platform's environment settings.

## Step 5: Deploy to Production

### Vercel Deployment

```bash
# Push to main branch (auto-deploys)
git push origin main

# Or deploy manually
vercel --prod
```

### Verify Deployment

1. Visit your production URL
2. Check that the app loads correctly
3. Test the Stripe checkout flow (use a real card in test mode first)

## Step 6: Test Production Webhook

### Test Webhook Delivery

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select event type: `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check the **"Logs"** tab to see if it was delivered successfully

### Monitor Webhook Logs

- **Stripe Dashboard**: https://dashboard.stripe.com/webhooks → Your endpoint → Logs
- **Your Server Logs**: Check your hosting platform's logs for webhook errors

## Step 7: Test Production Checkout

### Test with Real Card (Small Amount)

1. Use Stripe's test card: `4242 4242 4242 4242`
2. Complete checkout
3. Verify:
   - Subscription created in Stripe Dashboard
   - Credits added to organization
   - Subscription status updated in database

### Monitor First Real Payment

1. Watch Stripe Dashboard for payment events
2. Check webhook logs for successful delivery
3. Verify credits are added correctly
4. Check subscription status in your app

## Production Checklist

- [ ] Stripe account in **Live mode**
- [ ] Production API keys obtained (`sk_live_...`)
- [ ] Production product and price created
- [ ] Production webhook endpoint created
- [ ] Webhook signing secret obtained (`whsec_...`)
- [ ] Environment variables set in hosting platform
- [ ] App deployed to production
- [ ] Webhook endpoint URL is correct
- [ ] Test webhook delivery successful
- [ ] Test checkout flow works
- [ ] Monitor first real payment

## Security Best Practices

### 1. Never Commit Secrets

- ✅ Use environment variables
- ✅ Use `.env.local` for local development (gitignored)
- ❌ Never commit `.env` files with secrets

### 2. Use Different Keys for Test/Production

- **Test mode**: `sk_test_...` and `whsec_...` (test)
- **Live mode**: `sk_live_...` and `whsec_...` (production)

### 3. Webhook Security

- ✅ Always verify webhook signatures
- ✅ Use HTTPS for webhook endpoints
- ✅ Keep webhook secrets secure

### 4. Monitor Payments

- Set up Stripe email notifications
- Monitor webhook logs regularly
- Set up alerts for failed payments

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL**: Must be publicly accessible HTTPS
2. **Verify webhook secret**: Must match in environment variables
3. **Check Stripe logs**: Dashboard → Webhooks → Your endpoint → Logs
4. **Test endpoint**: Use Stripe CLI to test locally first

### Payment Succeeds But Credits Not Added

1. Check webhook logs in Stripe Dashboard
2. Verify webhook handler is processing `invoice.payment_succeeded`
3. Check server logs for errors
4. Verify `orgId` is in subscription metadata

### Subscription Status Not Updating

1. Check `customer.subscription.updated` webhook is enabled
2. Verify webhook handler updates subscription status
3. Check database for subscription events

## Support

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Docs**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com

## Next Steps After Production Launch

1. **Monitor first payments** closely
2. **Set up email notifications** in Stripe
3. **Configure payment retry settings** in Stripe
4. **Set up monitoring/alerts** for webhook failures
5. **Document any custom workflows** for your team

