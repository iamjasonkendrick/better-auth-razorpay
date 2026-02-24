import { describe, expect, it, vi } from "vitest";
import {
  onSubscriptionActivated,
  onSubscriptionAuthenticated,
  onSubscriptionCancelled,
  onSubscriptionCharged,
  onSubscriptionCompleted,
  onSubscriptionHalted,
  onSubscriptionPaused,
  onSubscriptionPending,
  onSubscriptionResumed,
  onSubscriptionUpdated,
} from "../hooks";
import type {
  RazorpayOptions,
  RazorpaySubscriptionEntity,
  RazorpayWebhookEvent,
  Subscription,
} from "../types";

// ─── Mock Factories ──────────────────────────────────────────────────────────

function makeMockAdapter() {
  return {
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function makeMockCtx(adapter = makeMockAdapter()) {
  return {
    context: {
      adapter,
      logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      },
    },
  } as any;
}

function makeRazorpaySub(
  overrides: Partial<RazorpaySubscriptionEntity> = {},
): RazorpaySubscriptionEntity {
  return {
    id: "sub_rzp_001",
    entity: "subscription",
    plan_id: "plan_001",
    customer_id: "cust_001",
    status: "active",
    current_start: 1700000000,
    current_end: 1702592000,
    ended_at: null,
    quantity: 1,
    notes: { userId: "u1", subscriptionId: "sub_db_001", referenceId: "u1" },
    charge_at: null,
    start_at: 1700000000,
    end_at: 1702592000,
    auth_attempts: 0,
    total_count: 12,
    paid_count: 1,
    customer_notify: true,
    created_at: 1700000000,
    expire_by: null,
    short_url: "https://rzp.io/abc",
    has_scheduled_changes: false,
    change_scheduled_at: null,
    source: "api",
    remaining_count: 11,
    ...overrides,
  };
}

function makeWebhookEvent(
  eventName: string,
  razorpaySub: RazorpaySubscriptionEntity,
): RazorpayWebhookEvent {
  return {
    entity: "event",
    account_id: "acc_001",
    event: eventName,
    contains: ["subscription"],
    payload: {
      subscription: { entity: razorpaySub },
    },
    created_at: Date.now() / 1000,
  };
}

function makeDbSubscription(
  overrides: Partial<Subscription> = {},
): Subscription {
  return {
    id: "sub_db_001",
    plan: "basic",
    referenceId: "u1",
    razorpayCustomerId: "cust_001",
    razorpaySubscriptionId: "sub_rzp_001",
    razorpayPlanId: "plan_001",
    status: "active",
    ...overrides,
  };
}

function makeOptions(
  overrides: Partial<RazorpayOptions> = {},
): RazorpayOptions {
  return {
    razorpayClient: {} as any,
    razorpayWebhookSecret: "secret",
    subscription: {
      enabled: true,
      plans: [{ planId: "plan_001", name: "Basic" }],
    },
    ...overrides,
  } as RazorpayOptions;
}

// ─── onSubscriptionAuthenticated ─────────────────────────────────────────────

describe("onSubscriptionAuthenticated", () => {
  it("updates existing subscription status to authenticated", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    const dbSub = makeDbSubscription({ status: "created" });
    adapter.findOne.mockResolvedValue(dbSub);
    adapter.update.mockResolvedValue({ ...dbSub, status: "authenticated" });

    const rzpSub = makeRazorpaySub({ status: "authenticated" });
    const event = makeWebhookEvent("subscription.authenticated", rzpSub);
    const callback = vi.fn();
    const options = makeOptions({
      subscription: {
        enabled: true,
        plans: [{ planId: "plan_001", name: "Basic" }],
        onSubscriptionAuthenticated: callback,
      },
    });

    await onSubscriptionAuthenticated(ctx, options, event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "subscription",
        update: expect.objectContaining({ status: "authenticated" }),
      }),
    );
    expect(callback).toHaveBeenCalled();
  });

  it("creates new subscription if not found", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(null);
    adapter.create.mockResolvedValue(
      makeDbSubscription({ status: "authenticated" }),
    );

    const rzpSub = makeRazorpaySub({ status: "authenticated" });
    const event = makeWebhookEvent("subscription.authenticated", rzpSub);
    const options = makeOptions();

    await onSubscriptionAuthenticated(ctx, options, event);

    expect(adapter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "subscription",
        data: expect.objectContaining({ status: "authenticated" }),
      }),
    );
  });

  it("does nothing if subscription is not enabled", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    const options = makeOptions({
      subscription: { enabled: false },
    });

    await onSubscriptionAuthenticated(
      ctx,
      options,
      makeWebhookEvent("subscription.authenticated", makeRazorpaySub()),
    );

    expect(adapter.findOne).not.toHaveBeenCalled();
  });

  it("does nothing if no subscription entity in payload", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    const event: RazorpayWebhookEvent = {
      entity: "event",
      account_id: "acc_001",
      event: "subscription.authenticated",
      contains: [],
      payload: {},
      created_at: Date.now() / 1000,
    };

    await onSubscriptionAuthenticated(ctx, makeOptions(), event);
    expect(adapter.findOne).not.toHaveBeenCalled();
  });
});

// ─── onSubscriptionActivated ─────────────────────────────────────────────────

describe("onSubscriptionActivated", () => {
  it("updates existing subscription to active", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    const dbSub = makeDbSubscription({ status: "authenticated" });
    adapter.findOne.mockResolvedValue(dbSub);
    adapter.update.mockResolvedValue({ ...dbSub, status: "active" });

    const rzpSub = makeRazorpaySub({ status: "active" });
    const event = makeWebhookEvent("subscription.activated", rzpSub);
    const callback = vi.fn();
    const options = makeOptions({
      subscription: {
        enabled: true,
        plans: [{ planId: "plan_001", name: "Basic" }],
        onSubscriptionActivated: callback,
      },
    });

    await onSubscriptionActivated(ctx, options, event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "subscription",
        update: expect.objectContaining({ status: "active" }),
      }),
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({ planId: "plan_001" }),
      }),
    );
  });

  it("creates new subscription if not found externally", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne
      .mockResolvedValueOnce(null) // findSubscriptionByRazorpayId
      .mockResolvedValueOnce(null) // findReferenceByRazorpayCustomerId - org
      .mockResolvedValueOnce({ id: "u1" }); // findReferenceByRazorpayCustomerId - user
    adapter.create.mockResolvedValue(makeDbSubscription({ status: "active" }));

    const rzpSub = makeRazorpaySub({ status: "active" });
    const event = makeWebhookEvent("subscription.activated", rzpSub);
    const options = makeOptions();

    await onSubscriptionActivated(ctx, options, event);

    expect(adapter.create).toHaveBeenCalled();
  });
});

// ─── onSubscriptionCharged ───────────────────────────────────────────────────

describe("onSubscriptionCharged", () => {
  it("updates payment counts and dates", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    const dbSub = makeDbSubscription();
    adapter.findOne.mockResolvedValue(dbSub);
    adapter.update.mockResolvedValue({ ...dbSub, paidCount: 2 });

    const rzpSub = makeRazorpaySub({ paid_count: 2, remaining_count: 10 });
    const event = makeWebhookEvent("subscription.charged", rzpSub);
    const callback = vi.fn();
    const options = makeOptions({
      subscription: {
        enabled: true,
        plans: [{ planId: "plan_001", name: "Basic" }],
        onSubscriptionCharged: callback,
      },
    });

    await onSubscriptionCharged(ctx, options, event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          paidCount: 2,
          remainingCount: 10,
        }),
      }),
    );
    expect(callback).toHaveBeenCalled();
  });

  it("logs warning if subscription not found", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(null);

    const event = makeWebhookEvent("subscription.charged", makeRazorpaySub());
    await onSubscriptionCharged(ctx, makeOptions(), event);

    expect(ctx.context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("not found"),
    );
  });
});

// ─── onSubscriptionPending ───────────────────────────────────────────────────

describe("onSubscriptionPending", () => {
  it("sets status to pending", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(makeDbSubscription());
    adapter.update.mockResolvedValue(makeDbSubscription({ status: "pending" }));

    const event = makeWebhookEvent(
      "subscription.pending",
      makeRazorpaySub({ status: "pending" }),
    );

    await onSubscriptionPending(ctx, makeOptions(), event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "pending" }),
      }),
    );
  });
});

// ─── onSubscriptionHalted ────────────────────────────────────────────────────

describe("onSubscriptionHalted", () => {
  it("sets status to halted", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(makeDbSubscription());
    adapter.update.mockResolvedValue(makeDbSubscription({ status: "halted" }));

    const event = makeWebhookEvent(
      "subscription.halted",
      makeRazorpaySub({ status: "halted" }),
    );

    await onSubscriptionHalted(ctx, makeOptions(), event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "halted" }),
      }),
    );
  });
});

// ─── onSubscriptionCompleted ─────────────────────────────────────────────────

describe("onSubscriptionCompleted", () => {
  it("sets status to completed with endedAt", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(makeDbSubscription());
    adapter.update.mockResolvedValue(
      makeDbSubscription({ status: "completed" }),
    );

    const rzpSub = makeRazorpaySub({
      status: "completed",
      ended_at: 1702592000,
      paid_count: 12,
    });
    const event = makeWebhookEvent("subscription.completed", rzpSub);

    await onSubscriptionCompleted(ctx, makeOptions(), event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "completed",
          paidCount: 12,
          remainingCount: 0,
        }),
      }),
    );
  });
});

// ─── onSubscriptionUpdated ───────────────────────────────────────────────────

describe("onSubscriptionUpdated", () => {
  it("updates plan and quantities", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(makeDbSubscription());
    adapter.update.mockResolvedValue(makeDbSubscription());

    const rzpSub = makeRazorpaySub({
      plan_id: "plan_001",
      quantity: 5,
      total_count: 24,
    });
    const event = makeWebhookEvent("subscription.updated", rzpSub);

    await onSubscriptionUpdated(ctx, makeOptions(), event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          razorpayPlanId: "plan_001",
          quantity: 5,
          totalCount: 24,
        }),
      }),
    );
  });
});

// ─── onSubscriptionPaused ────────────────────────────────────────────────────

describe("onSubscriptionPaused", () => {
  it("sets status to paused with pausedAt", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(makeDbSubscription());
    adapter.update.mockResolvedValue(makeDbSubscription({ status: "paused" }));

    const rzpSub = makeRazorpaySub({
      status: "paused",
      paused_at: 1701000000,
    });
    const event = makeWebhookEvent("subscription.paused", rzpSub);

    await onSubscriptionPaused(ctx, makeOptions(), event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "paused" }),
      }),
    );
  });
});

// ─── onSubscriptionResumed ───────────────────────────────────────────────────

describe("onSubscriptionResumed", () => {
  it("clears pausedAt and updates status", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(makeDbSubscription({ status: "paused" }));
    adapter.update.mockResolvedValue(makeDbSubscription({ status: "active" }));

    const rzpSub = makeRazorpaySub({ status: "active" });
    const event = makeWebhookEvent("subscription.resumed", rzpSub);

    await onSubscriptionResumed(ctx, makeOptions(), event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ pausedAt: null }),
      }),
    );
  });
});

// ─── onSubscriptionCancelled ─────────────────────────────────────────────────

describe("onSubscriptionCancelled", () => {
  it("sets status to cancelled with dates", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(makeDbSubscription());
    adapter.update.mockResolvedValue(
      makeDbSubscription({ status: "cancelled" }),
    );

    const rzpSub = makeRazorpaySub({
      status: "cancelled",
      ended_at: 1702592000,
    });
    const event = makeWebhookEvent("subscription.cancelled", rzpSub);
    const callback = vi.fn();
    const options = makeOptions({
      subscription: {
        enabled: true,
        plans: [{ planId: "plan_001", name: "Basic" }],
        onSubscriptionCancelled: callback,
      },
    });

    await onSubscriptionCancelled(ctx, options, event);

    expect(adapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "cancelled" }),
      }),
    );
    expect(callback).toHaveBeenCalled();
  });

  it("logs warning if subscription not found", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockResolvedValue(null);

    const event = makeWebhookEvent("subscription.cancelled", makeRazorpaySub());
    await onSubscriptionCancelled(ctx, makeOptions(), event);

    expect(ctx.context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("not found"),
    );
  });
});

// ─── Error Handling ──────────────────────────────────────────────────────────

describe("webhook handler error handling", () => {
  it("catches and logs errors without throwing", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeMockCtx(adapter);
    adapter.findOne.mockRejectedValue(new Error("DB connection failed"));

    const event = makeWebhookEvent("subscription.charged", makeRazorpaySub());

    // Should not throw
    await expect(
      onSubscriptionCharged(ctx, makeOptions(), event),
    ).resolves.toBeUndefined();

    expect(ctx.context.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("DB connection failed"),
    );
  });
});
