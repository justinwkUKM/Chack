# Subscription Auto-Renewal Guide

## Billing Cycle

**Duration: Yearly (365 days)**

- **Price**: $49/year
- **Billing Interval**: Every 365 days (1 year) from subscription start
- **Auto-Renewal**: Automatic (handled by Stripe)
- **Credits per Renewal**: 1,000 credits added each year

## How Auto-Renewal Works

### 1. Initial Subscription
When a user upgrades to Pro:
- Stripe creates a yearly subscription
- User is charged $49 immediately
- 1,000 credits are added to their account
- `stripeCurrentPeriodEnd` is set (365 days from now)

### 2. Yearly Renewal Process

**Day 1-364**: Subscription is active
- User can use credits
- Subscription status: `active`
- `stripeCurrentPeriodEnd` shows when renewal will occur

**Day 365 (Renewal Day)**:
1. **Stripe automatically charges** the customer's payment method
2. **If payment succeeds**:
   - Stripe sends `invoice.payment_succeeded` webhook
   - Webhook handler receives the event
   - **1,000 credits are automatically added** to the organization
   - `stripeCurrentPeriodEnd` is updated (next 30 days)
   - Subscription status remains `active`
   - Event is logged in `subscriptionEvents` table

3. **If payment fails**:
   - Stripe sends `invoice.payment_failed` webhook
   - Subscription status may change to `past_due`
   - User is notified (via Stripe email)
   - Credits are NOT added
   - User has a grace period to update payment method

### 3. Payment Retry Logic

Stripe automatically retries failed payments:
- **Day 1**: First attempt
- **Day 3**: Second retry
- **Day 5**: Third retry
- **Day 7**: Final retry

If all retries fail:
- Subscription status: `unpaid` or `canceled`
- User loses Pro plan access
- Plan downgrades to `free` (via webhook)

**Note**: For yearly subscriptions, retries happen within the first week after the renewal date.

## Webhook Events Handled

### `invoice.payment_succeeded`
**When**: Yearly payment succeeds
**Action**:
- Add 1,000 credits to organization
- Log event in `subscriptionEvents`
- Subscription remains active

### `invoice.payment_failed`
**When**: Payment fails
**Action**:
- Log event in `subscriptionEvents`
- User notified (Stripe handles email)
- Subscription may enter grace period

### `customer.subscription.updated`
**When**: Subscription status changes
**Action**:
- Update `stripeStatus` in database
- Update `stripeCurrentPeriodEnd`
- Sync subscription state

### `customer.subscription.deleted`
**When**: Subscription is canceled
**Action**:
- Downgrade plan to `free`
- Set `stripeStatus` to `canceled`
- Existing credits remain (no refund)

## Credit Renewal Details

### When Credits Are Added

1. **Initial Subscription**:
   - On `checkout.session.completed` webhook
   - Amount: 1,000 credits
   - Description: "Pro plan subscription - initial credits (yearly)"

2. **Yearly Renewal**:
   - On `invoice.payment_succeeded` webhook
   - Amount: 1,000 credits
   - Description: "Pro plan renewal - yearly credits"

### Credit Behavior

- **Credits carry over**: Unused credits from previous year are retained
- **Additive**: New credits are added to existing balance
- **No cap**: Credits can accumulate (e.g., 1,000 + 1,000 = 2,000)
- **Transaction log**: All credit additions are logged in `creditTransactions`

## Subscription Status Tracking

The system tracks:
- `stripeStatus`: `active` | `trialing` | `past_due` | `canceled` | `unpaid`
- `stripeCurrentPeriodEnd`: Unix timestamp of next renewal date
- `stripeSubscriptionId`: Stripe subscription ID
- `stripeCustomerId`: Stripe customer ID

## Viewing Renewal Date

Users can see their renewal date in:
- **Settings > Plans tab**: Shows "Renews: [date]"
- **Subscription details**: Available via `api.subscriptions.getSubscription`

## Example Timeline

**Day 0 (Subscription Start)**:
- User subscribes to Pro
- Charged $49
- Credits: 0 → 1,000
- Period End: Day 365

**Day 180 (6 months)**:
- User has used 500 credits
- Remaining: 500 credits
- Status: Active

**Day 365 (Renewal)**:
- Stripe charges $49
- Payment succeeds
- Credits: 500 → 1,500 (500 + 1,000)
- Period End: Day 730

**Day 730 (Next Renewal)**:
- Stripe charges $49
- Payment succeeds
- Credits: 1,500 → 2,500
- Period End: Day 1095

## Monitoring Renewals

### For Admins

Check subscription events:
```typescript
const events = await fetchQuery(api.subscriptions.getSubscriptionEvents, {
  orgId: "your-org-id",
  limit: 50
});
```

Look for:
- `payment_succeeded` events (successful renewals)
- `payment_failed` events (failed payments)
- `subscription_updated` events (status changes)

### For Users

- Check Settings > Plans for renewal date
- View credit transaction history in Settings > Credits
- See subscription status in Settings > Plans

## Troubleshooting

### Credits Not Added on Renewal

1. Check webhook logs in Stripe Dashboard
2. Verify webhook endpoint is receiving events
3. Check `subscriptionEvents` table for `payment_succeeded` events
4. Verify `invoice.payment_succeeded` webhook is enabled

### Payment Failed

1. User receives email from Stripe
2. User can update payment method via "Manage Billing"
3. Stripe will retry automatically
4. If all retries fail, subscription is canceled

### Subscription Not Renewing

1. Check Stripe Dashboard for subscription status
2. Verify payment method is valid
3. Check for `payment_failed` events
4. User should update payment method in Stripe Portal

