# BetterAuth Razorpay Plugin (Community)

This plugin integrates Razorpay subscriptions into your BetterAuth application, providing seamless customer and subscription management. It mirrors the functionality of the existing Stripe plugin, offering a consistent API for handling recurring payments.

## Features

- **Subscription Management**: Create, update, cancel, and restore subscriptions.
- **Customer Management**: Automatically create Razorpay customers on user sign-up.
- **Webhook Handling**: Process Razorpay webhook events for real-time subscription status updates.
- **Customizable Metadata**: Extend customer and subscription data with custom metadata via hooks.
- **Trial Periods**: Support for free trial configurations.
- **Multi-Seat Subscriptions**: Manage quantity-based subscriptions.

## Installation

Install the plugin using npm or yarn:

```bash
npm install better-auth-razorpay
# or
yarn add better-auth-razorpay
# or
bun add better-auth-razorpay
```

## Configuration

To use the BetterAuth Razorpay plugin, you need to initialize it with your Razorpay API keys and webhook secret.

1.  **Initialize Razorpay Client**:
    First, initialize the Razorpay client with your API Key ID and API Key Secret.

    ```typescript
    import Razorpay from "razorpay";

    const razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    ```

2.  **Configure BetterAuth Plugin**:
    Integrate the `razorpay` plugin into your BetterAuth configuration.

    ```typescript
    import { betterAuth } from "better-auth";
    import { razorpay } from "better-auth-razorpay";

    betterAuth({
      // ... other BetterAuth options
      plugins: [
        razorpay({
          razorpayClient,
          razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
          createCustomerOnSignUp: true, // Optional: Automatically create Razorpay customer on user sign-up
          onCustomerCreate: async ({ user, razorpayCustomer }) => {
            console.log(
              `Razorpay customer created for user ${user.id}: ${razorpayCustomer.id}`
            );
          },
          getCustomerCreateParams: async ({ user, session }) => {
            return {
              params: {
                // Add custom metadata to Razorpay customer
                notes: {
                  internalUserId: user.id,
                  // ... other custom notes
                },
              },
            };
          },
          subscription: {
            enabled: true,
            plans: [
              {
                name: "Starter",
                monthlyPlanId: "plan_ABCDEF123456", // Your Razorpay Plan ID
                annualPlanId: "plan_GHIJKL789012", // Optional: Annual Plan ID
                limits: {
                  features: 5,
                },
                freeTrial: {
                  days: 7,
                  onTrialStart: async (subscription) => {
                    console.log(
                      `Trial started for subscription ${subscription.id}`
                    );
                  },
                  onTrialEnd: async ({ subscription }) => {
                    console.log(
                      `Trial ended for subscription ${subscription.id}`
                    );
                  },
                },
              },
              // ... more plans
            ],
            requireEmailVerification: true, // Optional: Require email verification before subscription
            authorizeReference: async ({ user, referenceId, action }) => {
              // Implement your authorization logic here
              return user.id === referenceId;
            },
            getSubscriptionCreateParams: async ({
              user,
              session,
              plan,
              subscription,
            }) => {
              return {
                params: {
                  // Add custom metadata to Razorpay subscription
                  notes: {
                    customField: "value",
                  },
                },
              };
            },
            onSubscriptionCreated: async ({
              razorpaySubscription,
              subscription,
              plan,
            }) => {
              console.log(
                `Subscription ${subscription.id} created on Razorpay: ${razorpaySubscription.id}`
              );
            },
            onSubscriptionActivated: async ({
              event,
              razorpaySubscription,
              subscription,
              plan,
            }) => {
              console.log(`Subscription ${subscription.id} activated.`);
            },
            onSubscriptionUpdate: async ({ event, subscription }) => {
              console.log(`Subscription ${subscription.id} updated.`);
            },
            onSubscriptionCancel: async ({
              event,
              subscription,
              razorpaySubscription,
            }) => {
              console.log(`Subscription ${subscription.id} cancelled.`);
            },
          },
          onEvent: async (event) => {
            console.log(`Received Razorpay event: ${event.event}`);
          },
        }),
      ],
    });
    ```

### `RazorpayOptions` Interface

- `razorpayClient`: Your initialized `Razorpay` client instance.
- `razorpayWebhookSecret`: The secret key for verifying Razorpay webhooks.
- `createCustomerOnSignUp` (optional, `boolean`): If `true`, a Razorpay customer will be created automatically when a new user signs up. Defaults to `false`.
- `onCustomerCreate` (optional, `function`): A callback function that runs after a Razorpay customer is successfully created.
- `getCustomerCreateParams` (optional, `function`): A hook to provide custom parameters (e.g., `notes`) when creating a Razorpay customer.
- `subscription` (optional, `object`):
  - `enabled` (`boolean`): Enable/disable subscription features.
  - `plans` (`RazorpayPlan[] | () => Promise<RazorpayPlan[]>`): An array of your defined subscription plans or a function that returns them.
  - `requireEmailVerification` (optional, `boolean`): If `true`, users must have a verified email to subscribe.
  - `onSubscriptionCreated` (optional, `function`): Callback after a subscription is created.
  - `onSubscriptionActivated` (optional, `function`): Callback after a subscription is activated (e.g., after successful payment or trial start).
  - `onSubscriptionUpdate` (optional, `function`): Callback after a subscription is updated (e.g., plan change, status change).
  - `onSubscriptionCancel` (optional, `function`): Callback after a subscription is cancelled.
  - `authorizeReference` (optional, `function`): A hook to authorize actions based on a `referenceId`.
  - `getSubscriptionCreateParams` (optional, `function`): A hook to provide custom parameters (e.g., `notes`) when creating a Razorpay subscription.
- `onEvent` (optional, `function`): A global callback for all processed Razorpay webhook events.

## Usage

The plugin exposes several API endpoints for managing subscriptions:

### Create or Update Subscription

`POST /api/auth/razorpay/subscription/create-or-update`

Used to initiate a new subscription or change an existing one (upgrade/downgrade).

**Body Parameters**:

- `plan` (`string`, required): The name of the plan (as defined in your `plans` array).
- `annual` (`boolean`, optional): If `true`, attempts to subscribe to the annual version of the plan.
- `seats` (`number`, optional, default: `1`): Number of seats for the subscription.
- `subscriptionId` (`string`, optional): The local database ID of an existing subscription to update.
- `successUrl` (`string`, optional, default: `/`): URL to redirect to after successful Razorpay checkout.
- `disableRedirect` (`boolean`, optional, default: `false`): If `true`, prevents automatic redirect after checkout.

**Returns**:

- For new subscriptions: An object containing `checkoutUrl` for redirection to Razorpay's payment page.
- For updates: The updated Razorpay subscription object.

### Cancel Subscription

`POST /api/auth/razorpay/subscription/cancel`

Cancels an active subscription.

**Body Parameters**:

- `subscriptionId` (`string`, required): The local database ID of the subscription to cancel.
- `immediately` (`boolean`, optional, default: `false`): If `true`, cancels immediately. Otherwise, cancels at the end of the current billing cycle.

**Returns**: The cancelled Razorpay subscription object.

### Restore Subscription

`POST /api/auth/razorpay/subscription/restore`

Restores a subscription that was previously scheduled for cancellation at the end of the period.

**Body Parameters**:

- `subscriptionId` (`string`, required): The local database ID of the subscription to restore.

**Returns**: The restored Razorpay subscription object.

### List Active Subscriptions

`GET /api/auth/razorpay/subscription/list`

Lists all active and trialing subscriptions for the current user or a specified `referenceId`.

**Query Parameters**:

- `referenceId` (`string`, optional): The reference ID to list subscriptions for. If not provided, uses the current user's ID.

**Returns**: An array of `Subscription` objects.

## Webhook Setup

To receive real-time updates from Razorpay, you must configure a webhook in your Razorpay Dashboard:

1.  Go to your Razorpay Dashboard.
2.  Navigate to **Settings** > **Webhooks**.
3.  Click **Add New Webhook**.
4.  Set the **Webhook URL** to `YOUR_BASE_URL/api/auth/razorpay/webhook`.
5.  Enter your `RAZORPAY_WEBHOOK_SECRET` in the **Secret** field.
6.  Select the following events:
    - `subscription.activated`
    - `subscription.updated`
    - `subscription.cancelled`
    - `subscription.halted`
    - `subscription.resumed`
    - `subscription.expired`
7.  Click **Create Webhook**.

## Database Schema

The plugin requires a `subscription` model in your BetterAuth database adapter. The schema is automatically generated and can be accessed via `razorpay.schema`.

Example `subscription` schema (simplified):

```typescript
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user"; // Assuming your user schema

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  plan: text("plan").notNull(),
  referenceId: text("reference_id").notNull(),
  razorpayCustomerId: text("razorpay_customer_id"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  status: text("status", {
    enum: [
      "created",
      "active",
      "pending",
      "halted",
      "cancelled",
      "completed",
      "expired",
      "trialing",
    ],
  }).notNull(),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  seats: integer("seats").default(1),
  groupId: text("group_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, {
    fields: [subscriptions.referenceId],
    references: [user.id],
  }),
}));
```

Ensure your `user` schema also includes a `razorpayCustomerId` field:

```typescript
import { pgTable, text } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  razorpayCustomerId: text("razorpay_customer_id"), // Add this field
  // ... other user fields
});
```
