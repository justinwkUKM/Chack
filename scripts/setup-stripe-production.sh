#!/bin/bash

# Stripe Production Setup Script for CHACK
# This script helps set up Stripe products, prices, and webhooks for PRODUCTION

echo "🚀 CHACK Stripe Production Setup"
echo "================================="
echo ""
echo "⚠️  WARNING: This will create LIVE products in Stripe!"
echo "   Make sure you're ready for production billing."
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed!"
    echo "   Please install it first: brew install stripe/stripe-cli/stripe"
    exit 1
fi

echo "✅ Stripe CLI found: $(stripe --version)"
echo ""

# Check if logged in
echo "Checking Stripe login status..."
if ! stripe config --list &> /dev/null; then
    echo "⚠️  Not logged in to Stripe. Please run: stripe login"
    exit 1
fi

# Check if in live mode
echo "Checking Stripe mode..."
MODE=$(stripe config --list 2>/dev/null | grep -i "mode" | head -1 || echo "")
if [[ "$MODE" != *"live"* ]]; then
    echo "⚠️  You're not in live mode!"
    echo ""
    echo "To switch to live mode:"
    echo "  1. Visit: https://dashboard.stripe.com/apikeys"
    echo "  2. Copy your LIVE secret key (starts with sk_live_)"
    echo "  3. Run: stripe config --set live_mode_api_key sk_live_..."
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📦 Step 1: Creating CHACK Pro Product and Price (PRODUCTION)..."
echo "--------------------------------------------------------------"
echo ""

# Create product and price
PRICE_OUTPUT=$(stripe prices create \
  --product-data-name="CHACK Pro" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring-interval=year 2>&1)

if [ $? -eq 0 ]; then
    # Extract price ID from JSON output
    PRICE_ID=$(echo "$PRICE_OUTPUT" | grep -o '"id": "price_[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$PRICE_ID" ]; then
        echo "✅ Production price created successfully!"
        echo "   Price ID: $PRICE_ID"
        echo ""
        echo "⚠️  IMPORTANT: Save this Price ID for your production .env file!"
        echo "   STRIPE_PRO_PRICE_ID=$PRICE_ID"
        echo ""
    else
        echo "⚠️  Could not extract Price ID from output:"
        echo "$PRICE_OUTPUT"
        echo ""
        echo "Please manually copy the 'id' field from the output above"
    fi
else
    echo "❌ Failed to create price:"
    echo "$PRICE_OUTPUT"
    exit 1
fi

echo ""
echo "🔗 Step 2: Setting up Production Webhook"
echo "-----------------------------------------"
echo ""
echo "For production, you need to create a webhook endpoint in Stripe Dashboard:"
echo ""
echo "1. Visit: https://dashboard.stripe.com/webhooks"
echo "2. Click 'Add endpoint'"
echo "3. Endpoint URL: https://your-production-domain.com/api/stripe/webhook"
echo "4. Select events to listen for:"
echo "   - checkout.session.completed"
echo "   - customer.subscription.updated"
echo "   - customer.subscription.deleted"
echo "   - invoice.payment_succeeded"
echo "   - invoice.payment_failed"
echo "5. Copy the 'Signing secret' (starts with whsec_)"
echo "6. Add it to your production environment as STRIPE_WEBHOOK_SECRET"
echo ""
echo "📝 Step 3: Get Production API Keys"
echo "-----------------------------------"
echo "1. Visit: https://dashboard.stripe.com/apikeys"
echo "2. Copy your LIVE secret key (starts with sk_live_)"
echo "3. Add it to your production environment as STRIPE_SECRET_KEY"
echo ""
echo "✅ Production setup complete!"
echo ""
echo "📋 Production Environment Variables Needed:"
echo "   STRIPE_SECRET_KEY=sk_live_..."
echo "   STRIPE_PRO_PRICE_ID=$PRICE_ID"
echo "   STRIPE_WEBHOOK_SECRET=whsec_... (from webhook endpoint)"
echo ""

