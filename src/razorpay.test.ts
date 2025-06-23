import { betterAuth, type User } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuthClient } from "better-auth/client";
import { setCookieToHeader } from "better-auth/cookies";
import { bearer } from "better-auth/plugins";
import type Razorpay from "razorpay";
import { vi } from "vitest";
import { razorpayClient } from "./client";
import {
  razorpay,
  type InputSubscription,
  type RazorpayPlan,
  type Subscription,
} from "./index";

// Mock the Razorpay SDK's utility functions for webhook verification
vi.mock("razorpay/dist/utils/razorpay-utils", () => ({
  validateWebhookSignature: vi.fn().mockReturnValue(true),
}));

describe("razorpay", async () => {
  const mockRazorpay = {
    customers: {
      create: vi
        .fn()
        .mockResolvedValue({ id: "cust_mock123", email: "test@email.com" }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({
        id: "sub_mock_new",
        short_url: "https://rzp.io/i/mockcheckout",
      }),
      upgrade: vi
        .fn()
        .mockResolvedValue({ id: "sub_mock_upgraded", status: "active" }),
      cancel: vi
        .fn()
        .mockResolvedValue({ id: "sub_mock_cancelled", status: "cancelled" }),
      removeScheduledChange: vi
        .fn()
        .mockResolvedValue({ id: "sub_mock_restored" }),
      fetch: vi
        .fn()
        .mockResolvedValue({ id: "sub_mock_fetched", status: "active" }),
    },
  };

  const data = { user: [], session: [], verification: [], subscription: [] };
  const memory = memoryAdapter(data);

  const razorpayOptions = {
    razorpayClient: mockRazorpay as unknown as Razorpay,
    razorpayWebhookSecret: "test_webhook_secret",
    createCustomerOnSignUp: true,
    subscription: {
      enabled: true,
      plans: [
        { name: "starter", razorpayPlanId: "plan_starter_mock" },
        { name: "premium", razorpayPlanId: "plan_premium_mock" },
      ] as RazorpayPlan[],
    },
  };

  const auth = betterAuth({
    database: memory,
    baseURL: "http://localhost:3000",
    emailAndPassword: { enabled: true },
    plugins: [razorpay(razorpayOptions)],
  });
  const ctx = await auth.$context;

  // CORRECTED: Using createAuthClient and customFetchImpl exactly like the Stripe test file.
  const authClient = createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [
      bearer(),
      razorpayClient({
        subscription: true,
      }),
    ],
    fetchOptions: {
      customFetchImpl: async (url, init) => {
        return auth.handler(new Request(url, init));
      },
    },
  });

  const testUser = {
    email: "test@email.com",
    password: "password",
    name: "Test User",
  };

  beforeEach(() => {
    data.user = [];
    data.session = [];
    data.verification = [];
    data.subscription = [];
    vi.clearAllMocks();
  });

  // CORRECTED: Restoring the getHeader helper function for manual header management.
  async function getHeader() {
    const headers = new Headers();
    await authClient.signIn.email(testUser, {
      throw: true,
      onSuccess: setCookieToHeader(headers),
    });
    return { headers };
  }
  it("should create a customer on sign up", async () => {
    // Action: Sign up a new user.
    const userRes = await authClient.signUp.email(testUser, { throw: true });

    // Verification: Check if the Razorpay mock for customer creation was called.
    expect(mockRazorpay.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: testUser.email })
    );

    // Verification: Check the database for the newly assigned razorpayCustomerId.
    const res = await ctx.adapter.findOne<User>({
      model: "user",
      where: [{ field: "id", value: userRes.user.id }],
    });
    expect(res).toMatchObject({
      id: expect.any(String),
      razorpayCustomerId: "cust_mock123",
    });
  });

  it("should create a new subscription", async () => {
    // Setup: Sign up and sign in to get an authenticated session.
    const userRes = await authClient.signUp.email(testUser, { throw: true });
    const { headers } = await getHeader();

    // Action: Call the endpoint to create a subscription.
    const res = await authClient.subscription.createOrUpdateSubscription({
      plan: "starter",
      fetchOptions: { headers },
    });

    // Verification: Check the client response for the checkout URL.
    expect(res.data?.checkoutUrl).toBeDefined();
    expect(res.data?.redirect).toBe(true);

    // Verification: Check if the Razorpay mock for subscription creation was called.
    expect(mockRazorpay.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({ plan_id: "plan_starter_mock" })
    );

    // Verification: Check the database for the initial subscription record.
    const subscription = await ctx.adapter.findOne<Subscription>({
      model: "subscription",
      where: [{ field: "referenceId", value: userRes.user.id }],
    });
    expect(subscription).toMatchObject({ plan: "starter", status: "created" });
  });

  it("should list active subscriptions and ignore inactive ones", async () => {
    // Setup: Create and sign in a unique user for this test.
    const userRes = await authClient.signUp.email(
      { ...testUser, email: "list@email.com" },
      { throw: true }
    );
    const { headers } = await getHeader();

    // Action & Verification: List when there are no subscriptions.
    let listRes = await authClient.subscription.list({
      fetchOptions: { headers },
    });
    expect(listRes.data).toEqual([]);

    // Action: Create a subscription (it will have 'created' status).
    await authClient.subscription.createOrUpdateSubscription({
      plan: "starter",
      fetchOptions: { headers },
    });

    // Action & Verification: List again. The 'created' sub should not appear as active.
    listRes = await authClient.subscription.list({ fetchOptions: { headers } });
    expect(listRes.data?.length).toBe(0);

    // Setup: Manually update the DB to simulate a webhook activating the subscription.
    await ctx.adapter.update({
      model: "subscription",
      update: { status: "active" },
      where: [{ field: "referenceId", value: userRes.user.id }],
    });

    // Action & Verification: List one last time to get the active subscription.
    listRes = await authClient.subscription.list({ fetchOptions: { headers } });
    expect(listRes.data?.length).toBe(1);
    expect(listRes.data?.[0].status).toBe("active");
  });

  it("should upgrade an existing active subscription's plan", async () => {
    // Setup: Create a user with an active subscription.
    const userRes = await authClient.signUp.email(testUser, { throw: true });
    const { headers } = await getHeader();
    await ctx.adapter.create<InputSubscription, Subscription>({
      model: "subscription",
      data: {
        plan: "starter",
        status: "active",
        referenceId: userRes.user.id,
        razorpaySubscriptionId: "sub_to_be_upgraded",
      },
    });

    // Action: Call the endpoint with a new plan.
    await authClient.subscription.createOrUpdateSubscription({
      plan: "premium",
      fetchOptions: { headers },
    });

    // Verification: Check if the Razorpay upgrade API was called with the new plan ID.
    expect(mockRazorpay.subscriptions.upgrade).toHaveBeenCalledWith(
      "sub_to_be_upgraded",
      expect.objectContaining({ plan_id: "plan_premium_mock" })
    );
  });

  it("should allow seat-only upgrades for the same plan", async () => {
    // Setup: Create a user with an active subscription with 1 seat.
    const userRes = await authClient.signUp.email(
      { ...testUser, email: "seats@email.com" },
      { throw: true }
    );
    const { headers } = await getHeader();
    await ctx.adapter.create<InputSubscription, Subscription>({
      model: "subscription",
      data: {
        plan: "premium",
        status: "active",
        seats: 1,
        referenceId: userRes.user.id,
        razorpaySubscriptionId: "sub_seats_upgrade",
      },
    });

    // Action: Call the endpoint for the same plan but with more seats.
    await authClient.subscription.createOrUpdateSubscription({
      plan: "premium",
      seats: 5,
      fetchOptions: { headers },
    });

    // Verification: Check if the Razorpay upgrade API was called with the new quantity.
    expect(mockRazorpay.subscriptions.upgrade).toHaveBeenCalledWith(
      "sub_seats_upgrade",
      expect.objectContaining({ quantity: 5 })
    );
  });
  it("should cancel a subscription at the end of the period", async () => {
    // Setup: Create a user with an active subscription.
    const userRes = await authClient.signUp.email(testUser, { throw: true });
    const { headers } = await getHeader();
    const { id: subscriptionId } = await ctx.adapter.create<
      InputSubscription,
      Subscription
    >({
      model: "subscription",
      data: {
        plan: "premium",
        status: "active",
        referenceId: userRes.user.id,
        razorpaySubscriptionId: "sub_to_be_cancelled",
      },
    });

    // Action: Call the cancel endpoint, scheduling it for the end of the cycle.
    await authClient.subscription.cancel({
      subscriptionId,
      immediately: false,
      fetchOptions: { headers },
    });

    // Verification: Check that the Razorpay API was called to schedule the cancellation.
    expect(mockRazorpay.subscriptions.cancel).toHaveBeenCalledWith(
      "sub_to_be_cancelled",
      true // `cancel_at_cycle_end: true`
    );

    // Verification: Check the database to ensure our local record reflects this pending state.
    const subscription = await ctx.adapter.findOne<Subscription>({
      model: "subscription",
      where: [{ field: "id", value: subscriptionId }],
    });
    expect(subscription?.cancelAtPeriodEnd).toBe(true);
  });

  it("should restore a subscription scheduled for cancellation", async () => {
    // Setup: Create a user with a subscription that is already pending cancellation.
    const userRes = await authClient.signUp.email(testUser, { throw: true });
    const { headers } = await getHeader();
    const { id: subscriptionId } = await ctx.adapter.create<
      InputSubscription,
      Subscription
    >({
      model: "subscription",
      data: {
        plan: "premium",
        status: "active",
        referenceId: userRes.user.id,
        razorpaySubscriptionId: "sub_to_be_restored",
        cancelAtPeriodEnd: true,
      },
    });

    // Action: Call the restore endpoint.
    await authClient.subscription.restore({
      subscriptionId,
      fetchOptions: { headers },
    });

    // Verification: Check that the Razorpay API to remove the scheduled change was called.
    expect(
      mockRazorpay.subscriptions.removeScheduledChange
    ).toHaveBeenCalledWith("sub_to_be_restored");

    // Verification: Check the database to ensure the flag is flipped back to false.
    const subscription = await ctx.adapter.findOne<Subscription>({
      model: "subscription",
      where: [{ field: "id", value: subscriptionId }],
    });
    expect(subscription?.cancelAtPeriodEnd).toBe(false);
  });

  it("should fail to restore a subscription that is not scheduled for cancellation", async () => {
    // Setup: Create a user with a normal, active subscription.
    const userRes = await authClient.signUp.email(testUser, { throw: true });
    const { headers } = await getHeader();
    const { id: subscriptionId } = await ctx.adapter.create<
      InputSubscription,
      Subscription
    >({
      model: "subscription",
      data: {
        plan: "premium",
        status: "active",
        referenceId: userRes.user.id,
        razorpaySubscriptionId: "sub_cannot_be_restored",
        cancelAtPeriodEnd: false,
      },
    });

    // Action: Attempt to call restore on it.
    const res = await authClient.subscription.restore({
      subscriptionId,
      fetchOptions: { headers },
    });

    // Verification: The API call must fail with the specific error message.
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain(
      "Subscription is not scheduled for cancellation"
    );
  });

  it("should prevent creating a duplicate subscription for the same plan and seats", async () => {
    // Setup: Create a user and give them an active subscription.
    const userRes = await authClient.signUp.email(
      { ...testUser, email: "duplicate@email.com" },
      { throw: true }
    );
    const { headers } = await getHeader();
    await ctx.adapter.create<InputSubscription, Subscription>({
      model: "subscription",
      data: {
        plan: "starter",
        status: "active",
        seats: 1,
        referenceId: userRes.user.id,
      },
    });

    // Action: Attempt to create a subscription for the exact same plan and seats again.
    const res = await authClient.subscription.createOrUpdateSubscription({
      plan: "starter",
      seats: 1,
      fetchOptions: { headers },
    });

    // Verification: The API call should fail with the specific "already subscribed" error.
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain(
      "You're already subscribed to this plan"
    );
  });
  it("should handle the 'subscription.activated' webhook", async () => {
    // Setup: Create a subscription record in the DB that is waiting to be activated.
    const { id: subscriptionId } = await ctx.adapter.create<
      InputSubscription,
      Subscription
    >({
      model: "subscription",
      data: {
        plan: "starter",
        status: "created",
        referenceId: "user_webhook_test",
        razorpaySubscriptionId: "sub_webhook_activated",
      },
    });

    // Setup: Create the mock webhook event from Razorpay.
    const mockWebhookEvent = {
      event: "subscription.activated",
      payload: {
        subscription: {
          entity: {
            id: "sub_webhook_activated",
            plan_id: "plan_starter_mock",
            status: "active",
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 86400,
          },
        },
      },
    };

    // Action: Simulate Razorpay sending the webhook to our handler by creating a Request object.
    const webhookRequest = new Request(
      "http://localhost:3000/api/auth/razorpay/webhook",
      {
        method: "POST",
        headers: { "x-razorpay-signature": "mock_signature" },
        body: JSON.stringify(mockWebhookEvent),
      }
    );
    const response = await auth.handler(webhookRequest);

    // Verification: The handler must acknowledge receipt with a 200 OK.
    expect(response.status).toBe(200);

    // Verification: The subscription in our database must now be 'active'.
    const updatedSubscription = await ctx.adapter.findOne<Subscription>({
      model: "subscription",
      where: [{ field: "id", value: subscriptionId }],
    });
    expect(updatedSubscription?.status).toBe("active");
  });

  it("should execute all user-defined subscription event handlers", async () => {
    // Setup: Create mock functions for every user-defined callback hook.
    const onSubscriptionActivated = vi.fn();
    const onSubscriptionCancelled = vi.fn();

    // Setup: Create a special auth instance that includes these mock hooks in its config.
    // This is the correct pattern for testing user callbacks in isolation.
    const testAuthWithHooks = betterAuth({
      ...auth.options,
      plugins: [
        razorpay({
          ...razorpayOptions,
          subscription: {
            ...razorpayOptions.subscription!,
            onSubscriptionActivated,
            onSubscriptionCancelled,
          },
        }),
      ],
    });

    // --- Test 1: Activation Callback ---
    const { id: subIdToActivate } = await ctx.adapter.create<
      InputSubscription,
      Subscription
    >({
      model: "subscription",
      data: {
        plan: "starter",
        status: "created",
        referenceId: "user_activate_hook",
        razorpaySubscriptionId: "sub_activate_hook",
      },
    });
    const activationEvent = {
      event: "subscription.activated",
      payload: {
        subscription: {
          entity: {
            id: "sub_activate_hook",
            plan_id: "plan_starter_mock",
            status: "active",
            current_start: Date.now() / 1000,
            current_end: Date.now() / 1000 + 86400,
          },
        },
      },
    };
    await testAuthWithHooks.handler(
      new Request("http://localhost:3000/api/auth/razorpay/webhook", {
        method: "POST",
        headers: { "x-razorpay-signature": "mock_signature" },
        body: JSON.stringify(activationEvent),
      })
    );
    // Verification: The 'onSubscriptionActivated' hook must have been called with the correct data.
    expect(onSubscriptionActivated).toHaveBeenCalledWith(
      expect.objectContaining({
        event: activationEvent,
        subscription: expect.objectContaining({
          id: subIdToActivate,
          status: "active",
        }),
        plan: expect.objectContaining({ name: "starter" }),
      })
    );

    // --- Test 2: Cancellation Callback ---
    const { id: subIdToCancel } = await ctx.adapter.create<
      InputSubscription,
      Subscription
    >({
      model: "subscription",
      data: {
        plan: "premium",
        status: "active",
        referenceId: "user_cancel_hook",
        razorpaySubscriptionId: "sub_cancel_hook",
      },
    });
    const cancellationEvent = {
      event: "subscription.cancelled",
      payload: {
        subscription: {
          entity: {
            id: "sub_cancel_hook",
            plan_id: "plan_premium_mock",
            status: "cancelled",
          },
        },
      },
    };
    await testAuthWithHooks.handler(
      new Request("http://localhost:3000/api/auth/razorpay/webhook", {
        method: "POST",
        headers: { "x-razorpay-signature": "mock_signature" },
        body: JSON.stringify(cancellationEvent),
      })
    );
    // Verification: The 'onSubscriptionCancelled' hook must have been called with the correct data.
    expect(onSubscriptionCancelled).toHaveBeenCalledWith(
      expect.objectContaining({
        event: cancellationEvent,
        subscription: expect.objectContaining({
          id: subIdToCancel,
          status: "cancelled",
        }),
      })
    );
  });
});
