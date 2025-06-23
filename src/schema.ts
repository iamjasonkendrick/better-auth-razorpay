import type { AuthPluginSchema } from "better-auth";
import { mergeSchema } from "better-auth/db";
import type { RazorpayOptions } from "./types";

// Defines the 'subscription' table and its columns for the database.
export const subscriptions = {
  subscription: {
    fields: {
      plan: {
        type: "string",
        required: true,
      },
      referenceId: {
        type: "string",
        required: true,
      },
      razorpayCustomerId: {
        type: "string",
        required: false,
      },
      razorpaySubscriptionId: {
        type: "string",
        required: false,
      },
      status: {
        type: "string",
        // 'created' is the initial status in Razorpay before payment.
        defaultValue: "created",
      },
      periodStart: {
        type: "date",
        required: false,
      },
      periodEnd: {
        type: "date",
        required: false,
      },
      cancelAtPeriodEnd: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      seats: {
        type: "number",
        required: false,
      },
      trialStart: {
        type: "date",
        required: false,
      },
      trialEnd: {
        type: "date",
        required: false,
      },
      groupId: {
        type: "string",
        required: false,
      },
    },
  },
} satisfies AuthPluginSchema;

// Defines the new field to add to the existing 'user' table.
export const user = {
  user: {
    fields: {
      razorpayCustomerId: {
        type: "string",
        required: false,
      },
    },
  },
} satisfies AuthPluginSchema;

// A function to combine our plugin's schema with any custom schema from the user.
export const getSchema = (options: RazorpayOptions) => {
  if (
    options.schema &&
    !options.subscription?.enabled &&
    "subscription" in options.schema
  ) {
    options.schema.subscription = undefined;
  }
  return mergeSchema(
    {
      // Only include the subscription table if the feature is enabled.
      ...(options.subscription?.enabled ? subscriptions : {}),
      ...user,
    },
    options.schema
  );
};
