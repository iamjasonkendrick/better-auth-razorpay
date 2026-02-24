import type { BetterAuthPluginDBSchema } from "@better-auth/core/db";
import { mergeSchema } from "better-auth/db";
import type { RazorpayOptions } from "./types";

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
      razorpayPlanId: {
        type: "string",
        required: false,
      },
      status: {
        type: "string",
        defaultValue: "created",
      },
      currentStart: {
        type: "date",
        required: false,
      },
      currentEnd: {
        type: "date",
        required: false,
      },
      endedAt: {
        type: "date",
        required: false,
      },
      quantity: {
        type: "number",
        required: false,
        defaultValue: 1,
      },
      totalCount: {
        type: "number",
        required: false,
      },
      paidCount: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      remainingCount: {
        type: "number",
        required: false,
      },
      cancelledAt: {
        type: "date",
        required: false,
      },
      pausedAt: {
        type: "date",
        required: false,
      },
      shortUrl: {
        type: "string",
        required: false,
      },
      cancelAtCycleEnd: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      billingPeriod: {
        type: "string",
        required: false,
      },
    },
  },
} satisfies BetterAuthPluginDBSchema;

export const user = {
  user: {
    fields: {
      razorpayCustomerId: {
        type: "string",
        required: false,
      },
    },
  },
} satisfies BetterAuthPluginDBSchema;

export const organization = {
  organization: {
    fields: {
      razorpayCustomerId: {
        type: "string",
        required: false,
      },
    },
  },
} satisfies BetterAuthPluginDBSchema;

type GetSchemaResult<O extends RazorpayOptions> = typeof user &
  (O["subscription"] extends { enabled: true } ? typeof subscriptions : {}) &
  (O["organization"] extends { enabled: true } ? typeof organization : {});

export const getSchema = <O extends RazorpayOptions>(
  options: O,
): GetSchemaResult<O> => {
  let baseSchema: BetterAuthPluginDBSchema = {};

  if (options.subscription?.enabled) {
    baseSchema = {
      ...subscriptions,
      ...user,
    };
  } else {
    baseSchema = {
      ...user,
    };
  }

  if (options.organization?.enabled) {
    baseSchema = {
      ...baseSchema,
      ...organization,
    };
  }

  if (
    options.schema &&
    !options.subscription?.enabled &&
    "subscription" in options.schema
  ) {
    const { subscription: _subscription, ...restSchema } = options.schema;
    return mergeSchema(baseSchema, restSchema) as GetSchemaResult<O>;
  }

  return mergeSchema(baseSchema, options.schema) as GetSchemaResult<O>;
};
