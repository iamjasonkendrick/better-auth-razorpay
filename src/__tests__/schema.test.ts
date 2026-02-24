import { describe, expect, it } from "vitest";
import { getSchema, organization, subscriptions, user } from "../schema";
import type { RazorpayOptions } from "../types";

// ─── Raw Schema Definitions ─────────────────────────────────────────────────

describe("subscriptions schema", () => {
  it("defines a subscription model", () => {
    expect(subscriptions.subscription).toBeDefined();
    expect(subscriptions.subscription.fields).toBeDefined();
  });

  it("has all required fields", () => {
    const fields = subscriptions.subscription.fields;
    const expectedFields = [
      "plan",
      "referenceId",
      "razorpayCustomerId",
      "razorpaySubscriptionId",
      "razorpayPlanId",
      "status",
      "currentStart",
      "currentEnd",
      "endedAt",
      "quantity",
      "totalCount",
      "paidCount",
      "remainingCount",
      "cancelledAt",
      "pausedAt",
      "shortUrl",
      "cancelAtCycleEnd",
      "billingPeriod",
    ];

    for (const field of expectedFields) {
      expect(fields).toHaveProperty(field);
    }
  });

  it("plan and referenceId are required", () => {
    const fields = subscriptions.subscription.fields;
    expect(fields.plan.required).toBe(true);
    expect(fields.referenceId.required).toBe(true);
  });

  it("status defaults to 'created'", () => {
    expect(subscriptions.subscription.fields.status.defaultValue).toBe(
      "created",
    );
  });

  it("quantity defaults to 1", () => {
    expect(subscriptions.subscription.fields.quantity.defaultValue).toBe(1);
  });
});

describe("user schema", () => {
  it("extends user model with razorpayCustomerId", () => {
    expect(user.user.fields.razorpayCustomerId).toBeDefined();
    expect(user.user.fields.razorpayCustomerId.type).toBe("string");
    expect(user.user.fields.razorpayCustomerId.required).toBe(false);
  });
});

describe("organization schema", () => {
  it("extends organization model with razorpayCustomerId", () => {
    expect(organization.organization.fields.razorpayCustomerId).toBeDefined();
    expect(organization.organization.fields.razorpayCustomerId.type).toBe(
      "string",
    );
  });
});

// ─── getSchema ──────────────────────────────────────────────────────────────

describe("getSchema", () => {
  const baseOptions: RazorpayOptions = {
    razorpayClient: {} as any,
    razorpayWebhookSecret: "secret",
  };

  it("returns user schema when subscriptions disabled", () => {
    const schema = getSchema(baseOptions);
    expect(schema).toHaveProperty("user");
    expect(schema).not.toHaveProperty("subscription");
  });

  it("returns user + subscription schema when subscriptions enabled", () => {
    const schema = getSchema({
      ...baseOptions,
      subscription: {
        enabled: true,
        plans: [],
      },
    } as any);
    expect(schema).toHaveProperty("user");
    expect(schema).toHaveProperty("subscription");
  });

  it("includes organization schema when organization enabled", () => {
    const schema = getSchema({
      ...baseOptions,
      organization: { enabled: true },
    } as any);
    expect(schema).toHaveProperty("user");
    expect(schema).toHaveProperty("organization");
  });

  it("merges custom schema overrides", () => {
    const schema = getSchema({
      ...baseOptions,
      subscription: {
        enabled: true,
        plans: [],
      },
      schema: {
        subscription: {
          modelName: "razorpay_subscription",
        },
      },
    } as any);
    expect(schema).toHaveProperty("subscription");
  });

  it("strips subscription from custom schema when subscriptions not enabled", () => {
    const schema = getSchema({
      ...baseOptions,
      schema: {
        subscription: {
          modelName: "razorpay_subscription",
        },
      },
    } as any);
    // Should not include subscription since it's not enabled
    expect(schema).not.toHaveProperty("subscription");
  });
});
