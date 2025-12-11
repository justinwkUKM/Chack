#!/bin/bash

# Stripe Setup Script for CHACK
# This script helps set up Stripe products, prices, and webhooks

echo "🔧 CHACK Stripe Setup Script"
echo "============================"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed!"
    echo ""
    echo "Please install it first:"
    echo "  Option 1: brew install stripe/stripe-cli/stripe"
    echo "  Option 2: Download from https://github.com/stripe/stripe-cli/releases"
    echo ""
    exit 1
fi

echo "✅ Stripe CLI found: $(stripe --version)"
echo ""

# Check if logged in
echo "Checking Stripe login status..."
if ! stripe config --list &> /dev/null; then
    echo "⚠️  Not logged in to Stripe. Please run: stripe login"
    echo ""
    read -p "Do you want to login now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        stripe login
    else
        echo "Please login first: stripe login"
        exit 1
    fi
fi

echo ""
echo "📦 Step 1: Creating CHACK Pro Product and Price..."
echo "---------------------------------------------------"
echo ""

# Create product and price
PRICE_OUTPUT=$(stripe prices create \
  --product-data-name="CHACK Pro" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring-interval=month 2>&1)

if [ $? -eq 0 ]; then
    # Extract price ID from JSON output
    PRICE_ID=$(echo "$PRICE_OUTPUT" | grep -o '"id": "price_[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$PRICE_ID" ]; then
        echo "✅ Price created successfully!"
        echo "   Price ID: $PRICE_ID"
        echo ""
        
        # Update .env.local
        if [ -f .env.local ]; then
            # Check if STRIPE_PRO_PRICE_ID already exists
            if grep -q "STRIPE_PRO_PRICE_ID" .env.local; then
                # Update existing value
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    # macOS
                    sed -i '' "s|STRIPE_PRO_PRICE_ID=.*|STRIPE_PRO_PRICE_ID=$PRICE_ID|" .env.local
                else
                    # Linux
                    sed -i "s|STRIPE_PRO_PRICE_ID=.*|STRIPE_PRO_PRICE_ID=$PRICE_ID|" .env.local
                fi
                echo "✅ Updated STRIPE_PRO_PRICE_ID in .env.local"
            else
                # Add new line
                echo "STRIPE_PRO_PRICE_ID=$PRICE_ID" >> .env.local
                echo "✅ Added STRIPE_PRO_PRICE_ID to .env.local"
            fi
        else
            echo "⚠️  .env.local not found. Please add manually:"
            echo "   STRIPE_PRO_PRICE_ID=$PRICE_ID"
        fi
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
echo "🔗 Step 2: Setting up Webhook Forwarding (Local Development)"
echo "-----------------------------------------------------------"
echo ""
echo "To get your webhook secret for local development, run this in a separate terminal:"
echo ""
echo "  stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo ""
echo "This will output a webhook secret (whsec_...) that you should add to .env.local as:"
echo "  STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo "Keep that terminal running while developing!"
echo ""
echo "📝 Step 3: Update .env.local with your Stripe Secret Key"
echo "--------------------------------------------------------"
echo "Get your Stripe Secret Key from: https://dashboard.stripe.com/test/apikeys"
echo "Add it to .env.local as:"
echo "  STRIPE_SECRET_KEY=sk_test_..."
echo ""
echo "✅ Setup complete! Your .env.local should now have:"
echo "   - STRIPE_SECRET_KEY (from Stripe Dashboard)"
echo "   - STRIPE_PRO_PRICE_ID (created above: $PRICE_ID)"
echo "   - STRIPE_WEBHOOK_SECRET (from 'stripe listen' command)"
echo ""

