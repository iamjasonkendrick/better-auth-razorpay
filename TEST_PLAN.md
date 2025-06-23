# Razorpay Plugin Test Plan

## 1. Subscription Creation

```typescript
// Test: Create new subscription
const response = await fetch(
  "/api/auth/razorpay/subscription/create-or-update",
  {
    method: "POST",
    body: JSON.stringify({
      plan: "pro",
      seats: 2,
      successUrl: "/dashboard",
    }),
  }
);
// Verify:
// - Returns checkout URL
// - Creates subscription in 'created' state
// - Creates Razorpay customer if not exists
```

## 2. Subscription Upgrade/Downgrade

```typescript
// Test: Upgrade existing subscription
const response = await fetch(
  "/api/auth/razorpay/subscription/create-or-update",
  {
    method: "POST",
    body: JSON.stringify({
      subscriptionId: "sub_123",
      plan: "premium",
      seats: 3,
    }),
  }
);
// Verify:
// - Updates subscription via Razorpay API
// - Updates local subscription record
// - Returns no redirect
```

## 3. Webhook Handling

```typescript
// Test: subscription.activated event
const event = {
  event: 'subscription.activated',
  payload: { subscription: { entity: { /* mock data */ } }
};
const response = await fetch('/api/auth/razorpay/webhook', {
  method: 'POST',
  body: JSON.stringify(event),
  headers: { 'x-razorpay-signature': validSignature }
});
// Verify:
// - Updates subscription status to 'active' or 'trialing'
// - Sets period/trial dates correctly
```

## 4. Customer Creation Hook

```typescript
// Test: User sign-up with createCustomerOnSignUp=true
const newUser = await createUser({ email: "test@example.com" });
// Verify:
// - Razorpay customer created
// - Customer ID saved to user record
// - onCustomerCreate hook called
```

## 5. Error Handling

```typescript
// Test: Create subscription without email verification
const response = await fetch(
  "/api/auth/razorpay/subscription/create-or-update",
  {
    method: "POST",
    body: JSON.stringify({ plan: "pro" }),
  }
);
// Verify: Returns 400 with EMAIL_VERIFICATION_REQUIRED error
```

## 6. Security Tests

```typescript
// Test: Webhook with invalid signature
const response = await fetch("/api/auth/razorpay/webhook", {
  method: "POST",
  body: "{}",
  headers: { "x-razorpay-signature": "invalid" },
});
// Verify: Returns 401 Unauthorized
```

## 7. Edge Cases

```typescript
// Test: Cancel immediately vs at period end
// Test: Restore cancelled subscription
// Test: Handle subscription expiration
// Test: Concurrent subscription updates
```

## Verification Checklist

- [ ] All API endpoints return expected responses
- [ ] Database state matches Razorpay state
- [ ] Webhook events properly update subscriptions
- [ ] Error cases handled gracefully
- [ ] Security measures effective (signature verification, origin checks)
- [ ] Logging provides sufficient debugging info
