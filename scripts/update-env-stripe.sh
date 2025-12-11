#!/bin/bash

# Helper script to update .env.local with Stripe values
# Usage: ./scripts/update-env-stripe.sh <STRIPE_SECRET_KEY> <STRIPE_PRO_PRICE_ID> <STRIPE_WEBHOOK_SECRET>

if [ $# -lt 3 ]; then
    echo "Usage: $0 <STRIPE_SECRET_KEY> <STRIPE_PRO_PRICE_ID> <STRIPE_WEBHOOK_SECRET>"
    echo ""
    echo "Example:"
    echo "  $0 sk_test_123... price_1Qxyz... whsec_123..."
    exit 1
fi

STRIPE_SECRET_KEY=$1
STRIPE_PRO_PRICE_ID=$2
STRIPE_WEBHOOK_SECRET=$3

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.local not found!"
    exit 1
fi

echo "📝 Updating .env.local with Stripe values..."
echo ""

# Function to update or add env variable
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        fi
        echo "✅ Updated $key"
    else
        # Add new
        echo "" >> "$ENV_FILE"
        echo "# Stripe Configuration" >> "$ENV_FILE"
        echo "${key}=${value}" >> "$ENV_FILE"
        echo "✅ Added $key"
    fi
}

# Update or add each variable
update_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
update_env_var "STRIPE_PRO_PRICE_ID" "$STRIPE_PRO_PRICE_ID"
update_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"

echo ""
echo "✅ .env.local updated successfully!"
echo ""
echo "Current Stripe configuration:"
grep -E "STRIPE_(SECRET_KEY|PRO_PRICE_ID|WEBHOOK_SECRET)" "$ENV_FILE" | sed 's/=.*/=***/'

