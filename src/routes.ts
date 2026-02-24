import { createAuthEndpoint } from "@better-auth/core/api";
import * as crypto from "node:crypto";
import { z } from "zod";
import { RAZORPAY_ERROR_CODES } from "./error-codes";
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
} from "./hooks";
import { subscriptionNotes } from "./metadata";
import { razorpaySessionMiddleware, referenceMiddleware } from "./middleware";
import type {
  RazorpayOptions,
  RazorpayWebhookEvent,
  Subscription,
  WithRazorpayCustomerId,
} from "./types";
import {
  createAPIError,
  getPlans,
  isActive,
  isCancelled,
  isPaused,
  isTerminal,
} from "./utils";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const upgradeSubscriptionBodySchema = z.object({
  plan: z.string(),
  referenceId: z.string().optional(),
  customerType: z.enum(["user", "organization"]).optional(),
  annual: z.boolean().optional(),
});

const cancelSubscriptionBodySchema = z.object({
  referenceId: z.string().optional(),
  customerType: z.enum(["user", "organization"]).optional(),
  cancelAtCycleEnd: z.boolean().optional(),
});

const pauseSubscriptionBodySchema = z.object({
  referenceId: z.string().optional(),
  customerType: z.enum(["user", "organization"]).optional(),
  pauseAt: z.literal("now").optional(),
});

const resumeSubscriptionBodySchema = z.object({
  referenceId: z.string().optional(),
  customerType: z.enum(["user", "organization"]).optional(),
  resumeAt: z.literal("now").optional(),
});

const listSubscriptionsQuerySchema = z.object({
  referenceId: z.string().optional(),
  customerType: z.enum(["user", "organization"]).optional(),
});

const updateSubscriptionBodySchema = z.object({
  referenceId: z.string().optional(),
  customerType: z.enum(["user", "organization"]).optional(),
  planId: z.string().optional(),
  quantity: z.number().optional(),
  remainingCount: z.number().optional(),
  scheduleChangeAt: z.enum(["now", "cycle_end"]).optional(),
});

const fetchSubscriptionQuerySchema = z.object({
  subscriptionId: z.string(),
});

const createPlanBodySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  interval: z.number(),
  itemName: z.string(),
  itemAmount: z.number(),
  itemCurrency: z.string().default("INR"),
  itemDescription: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

const fetchPlanQuerySchema = z.object({
  planId: z.string(),
});

const subscriptionLinkBodySchema = z.object({
  planId: z.string(),
  totalCount: z.number(),
  quantity: z.number().optional(),
  expireBy: z.number().optional(),
  customerNotify: z.boolean().optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

const pendingUpdateQuerySchema = z.object({
  subscriptionId: z.string(),
});

const cancelUpdateBodySchema = z.object({
  subscriptionId: z.string(),
});

const invoicesQuerySchema = z.object({
  subscriptionId: z.string(),
});

const linkOfferBodySchema = z.object({
  subscriptionId: z.string(),
  offerId: z.string(),
});

const deleteOfferBodySchema = z.object({
  subscriptionId: z.string(),
  offerId: z.string(),
});

const createCustomerBodySchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  contact: z.string().optional(),
  failExisting: z.boolean().optional(),
  gstin: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

const editCustomerBodySchema = z.object({
  customerId: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  contact: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

const fetchCustomerQuerySchema = z.object({
  customerId: z.string(),
});

// ─── Subscription Endpoints ──────────────────────────────────────────────────

/**
 * POST /subscription/upgrade
 *
 * Create a new subscription or upgrade to a different plan.
 */
export const upgradeSubscription = (options: RazorpayOptions) => {
  if (!options.subscription?.enabled) {
    throw new Error("Subscriptions must be enabled to use upgradeSubscription");
  }
  const subscriptionOptions = options.subscription;
  return createAuthEndpoint(
    "/subscription/upgrade",
    {
      method: "POST",
      body: upgradeSubscriptionBodySchema,
      metadata: {
        openapi: {
          summary: "Upgrade or create subscription",
          description:
            "Create a new Razorpay subscription or upgrade to a different plan",
          responses: {
            200: {
              description: "Subscription created/upgraded successfully",
            },
          },
        },
      },
      use: [
        razorpaySessionMiddleware,
        referenceMiddleware(subscriptionOptions, "upgrade-subscription"),
      ],
    },
    async (ctx) => {
      const { plan: planName, referenceId: bodyReferenceId, annual } = ctx.body;
      const session = ctx.context.session;
      const user = session.user as typeof session.user & WithRazorpayCustomerId;

      // Verify email if required
      if (subscriptionOptions.requireEmailVerification && !user.emailVerified) {
        throw createAPIError(
          "FORBIDDEN",
          RAZORPAY_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED,
        );
      }

      // Resolve plans
      const plans = await getPlans(options.subscription);
      if (!plans) {
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.FAILED_TO_FETCH_PLANS,
        );
      }

      const plan = plans.find(
        (p) => p.name.toLowerCase() === planName.toLowerCase(),
      );
      if (!plan) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_PLAN_NOT_FOUND,
        );
      }

      // Determine reference
      const customerType = ctx.body.customerType || "user";
      const referenceId =
        bodyReferenceId ||
        (customerType === "organization"
          ? session.session.activeOrganizationId
          : user.id);

      if (!referenceId) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.ORGANIZATION_REFERENCE_ID_REQUIRED,
        );
      }

      // Check for customer
      const razorpayCustomerId = user.razorpayCustomerId;
      if (!razorpayCustomerId) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.CUSTOMER_NOT_FOUND,
        );
      }

      // Check for existing active subscription in same group
      const existingSubs = await ctx.context.adapter.findMany<Subscription>({
        model: "subscription",
        where: [
          { field: "referenceId", value: referenceId },
          ...(plan.group
            ? [{ field: "groupId" as const, value: plan.group }]
            : []),
        ],
      });

      const activeSub = existingSubs.find(
        (s) => isActive(s) || s.status === "authenticated",
      );
      if (activeSub && activeSub.plan === plan.name.toLowerCase()) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.ALREADY_SUBSCRIBED_PLAN,
        );
      }

      // Determine which plan ID to use
      const razorpayPlanId =
        annual && plan.annualPlanId ? plan.annualPlanId : plan.planId;

      // Create subscription record in DB first
      const dbSubscription = await ctx.context.adapter.create<Subscription>({
        model: "subscription",
        data: {
          plan: plan.name.toLowerCase(),
          referenceId,
          razorpayCustomerId,
          razorpayPlanId: razorpayPlanId,
          status: "created",
          quantity: plan.quantity || 1,
          totalCount: plan.totalCount || 0,
          ...(plan.group ? { groupId: plan.group } : {}),
        },
      });

      // Create Razorpay subscription
      const client = options.razorpayClient;

      const subscriptionCreateParams: Record<string, unknown> = {
        plan_id: razorpayPlanId,
        customer_id: razorpayCustomerId,
        quantity: plan.quantity || 1,
        total_count: plan.totalCount || 0,
        notes: subscriptionNotes.set({
          userId: user.id,
          subscriptionId: dbSubscription.id,
          referenceId,
        }),
      };

      // Add free trial offset
      if (plan.freeTrial?.days) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + plan.freeTrial.days);
        subscriptionCreateParams.start_at = Math.floor(
          trialEnd.getTime() / 1000,
        );
      }

      // Allow user customization
      if (subscriptionOptions.getSubscriptionCreateParams) {
        const extra = await subscriptionOptions.getSubscriptionCreateParams(
          { user, session: session.session, plan },
          ctx,
        );
        Object.assign(subscriptionCreateParams, extra);
      }

      try {
        const razorpaySub = await (client.subscriptions as any).create(
          subscriptionCreateParams,
        );

        // Update DB with Razorpay subscription ID
        const updated = await ctx.context.adapter.update<Subscription>({
          model: "subscription",
          update: {
            razorpaySubscriptionId: razorpaySub.id,
            shortUrl: razorpaySub.short_url || null,
            updatedAt: new Date(),
          },
          where: [{ field: "id", value: dbSubscription.id }],
        });

        return ctx.json({
          subscription: updated || dbSubscription,
          razorpaySubscription: razorpaySub,
        });
      } catch (error: any) {
        // Cleanup DB record on failure
        await ctx.context.adapter.delete({
          model: "subscription",
          where: [{ field: "id", value: dbSubscription.id }],
        });
        ctx.context.logger.error(
          `Failed to create Razorpay subscription: ${error.message}`,
        );
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_UPDATE_FAILED,
        );
      }
    },
  );
};

/**
 * POST /subscription/cancel
 *
 * Cancel an active subscription.
 */
export const cancelSubscription = (options: RazorpayOptions) => {
  if (!options.subscription?.enabled) {
    throw new Error("Subscriptions must be enabled");
  }
  const subscriptionOptions = options.subscription;
  return createAuthEndpoint(
    "/subscription/cancel",
    {
      method: "POST",
      body: cancelSubscriptionBodySchema,
      metadata: {
        openapi: {
          summary: "Cancel subscription",
          description: "Cancel an active Razorpay subscription",
          responses: { 200: { description: "Subscription cancelled" } },
        },
      },
      use: [
        razorpaySessionMiddleware,
        referenceMiddleware(subscriptionOptions, "cancel-subscription"),
      ],
    },
    async (ctx) => {
      const session = ctx.context.session;
      const user = session.user as typeof session.user & WithRazorpayCustomerId;
      const customerType = ctx.body.customerType || "user";
      const referenceId =
        ctx.body.referenceId ||
        (customerType === "organization"
          ? session.session.activeOrganizationId
          : user.id);

      if (!referenceId) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.ORGANIZATION_REFERENCE_ID_REQUIRED,
        );
      }

      const subscription = await ctx.context.adapter.findOne<Subscription>({
        model: "subscription",
        where: [{ field: "referenceId", value: referenceId }],
      });

      if (!subscription?.razorpaySubscriptionId) {
        throw createAPIError(
          "NOT_FOUND",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
        );
      }

      if (isCancelled(subscription) || isTerminal(subscription)) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_ALREADY_CANCELLED,
        );
      }

      try {
        const client = options.razorpayClient;
        const cancelAtCycleEnd = ctx.body.cancelAtCycleEnd ?? false;

        await (client.subscriptions as any).cancel(
          subscription.razorpaySubscriptionId,
          cancelAtCycleEnd,
        );

        const updated = await ctx.context.adapter.update<Subscription>({
          model: "subscription",
          update: {
            ...(cancelAtCycleEnd
              ? { cancelAtCycleEnd: true }
              : {
                  status: "cancelled",
                  cancelledAt: new Date(),
                  endedAt: new Date(),
                }),
            updatedAt: new Date(),
          },
          where: [{ field: "id", value: subscription.id }],
        });

        return ctx.json({ subscription: updated || subscription });
      } catch (error: any) {
        ctx.context.logger.error(
          `Failed to cancel subscription: ${error.message}`,
        );
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_CANCEL_FAILED,
        );
      }
    },
  );
};

/**
 * POST /subscription/pause
 *
 * Pause an active subscription (Razorpay-specific).
 */
export const pauseSubscription = (options: RazorpayOptions) => {
  if (!options.subscription?.enabled) {
    throw new Error("Subscriptions must be enabled");
  }
  const subscriptionOptions = options.subscription;
  return createAuthEndpoint(
    "/subscription/pause",
    {
      method: "POST",
      body: pauseSubscriptionBodySchema,
      metadata: {
        openapi: {
          summary: "Pause subscription",
          description: "Pause an active Razorpay subscription",
          responses: { 200: { description: "Subscription paused" } },
        },
      },
      use: [
        razorpaySessionMiddleware,
        referenceMiddleware(subscriptionOptions, "pause-subscription"),
      ],
    },
    async (ctx) => {
      const session = ctx.context.session;
      const user = session.user as typeof session.user & WithRazorpayCustomerId;
      const customerType = ctx.body.customerType || "user";
      const referenceId =
        ctx.body.referenceId ||
        (customerType === "organization"
          ? session.session.activeOrganizationId
          : user.id);

      if (!referenceId) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.ORGANIZATION_REFERENCE_ID_REQUIRED,
        );
      }

      const subscription = await ctx.context.adapter.findOne<Subscription>({
        model: "subscription",
        where: [{ field: "referenceId", value: referenceId }],
      });

      if (!subscription?.razorpaySubscriptionId) {
        throw createAPIError(
          "NOT_FOUND",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
        );
      }

      if (!isActive(subscription)) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_ACTIVE,
        );
      }

      if (isPaused(subscription)) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_ALREADY_PAUSED,
        );
      }

      try {
        const client = options.razorpayClient;
        await (client.subscriptions as any).pause(
          subscription.razorpaySubscriptionId,
          { pause_at: ctx.body.pauseAt || "now" },
        );

        const updated = await ctx.context.adapter.update<Subscription>({
          model: "subscription",
          update: {
            status: "paused",
            pausedAt: new Date(),
            updatedAt: new Date(),
          },
          where: [{ field: "id", value: subscription.id }],
        });

        return ctx.json({ subscription: updated || subscription });
      } catch (error: any) {
        ctx.context.logger.error(
          `Failed to pause subscription: ${error.message}`,
        );
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_PAUSE_FAILED,
        );
      }
    },
  );
};

/**
 * POST /subscription/resume
 *
 * Resume a paused subscription (Razorpay-specific).
 */
export const resumeSubscription = (options: RazorpayOptions) => {
  if (!options.subscription?.enabled) {
    throw new Error("Subscriptions must be enabled");
  }
  const subscriptionOptions = options.subscription;
  return createAuthEndpoint(
    "/subscription/resume",
    {
      method: "POST",
      body: resumeSubscriptionBodySchema,
      metadata: {
        openapi: {
          summary: "Resume subscription",
          description: "Resume a paused Razorpay subscription",
          responses: { 200: { description: "Subscription resumed" } },
        },
      },
      use: [
        razorpaySessionMiddleware,
        referenceMiddleware(subscriptionOptions, "resume-subscription"),
      ],
    },
    async (ctx) => {
      const session = ctx.context.session;
      const user = session.user as typeof session.user & WithRazorpayCustomerId;
      const customerType = ctx.body.customerType || "user";
      const referenceId =
        ctx.body.referenceId ||
        (customerType === "organization"
          ? session.session.activeOrganizationId
          : user.id);

      if (!referenceId) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.ORGANIZATION_REFERENCE_ID_REQUIRED,
        );
      }

      const subscription = await ctx.context.adapter.findOne<Subscription>({
        model: "subscription",
        where: [{ field: "referenceId", value: referenceId }],
      });

      if (!subscription?.razorpaySubscriptionId) {
        throw createAPIError(
          "NOT_FOUND",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
        );
      }

      if (!isPaused(subscription)) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_PAUSED,
        );
      }

      try {
        const client = options.razorpayClient;
        await (client.subscriptions as any).resume(
          subscription.razorpaySubscriptionId,
          { resume_at: ctx.body.resumeAt || "now" },
        );

        const updated = await ctx.context.adapter.update<Subscription>({
          model: "subscription",
          update: {
            status: "active",
            pausedAt: null,
            updatedAt: new Date(),
          },
          where: [{ field: "id", value: subscription.id }],
        });

        return ctx.json({ subscription: updated || subscription });
      } catch (error: any) {
        ctx.context.logger.error(
          `Failed to resume subscription: ${error.message}`,
        );
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_RESUME_FAILED,
        );
      }
    },
  );
};

/**
 * GET /subscription/list
 *
 * List subscriptions for the current user or reference.
 */
export const listSubscriptions = (options: RazorpayOptions) => {
  if (!options.subscription?.enabled) {
    throw new Error("Subscriptions must be enabled");
  }
  const subscriptionOptions = options.subscription;
  return createAuthEndpoint(
    "/subscription/list",
    {
      method: "GET",
      query: listSubscriptionsQuerySchema,
      metadata: {
        openapi: {
          summary: "List subscriptions",
          description:
            "List all subscriptions for the current user or reference",
          responses: { 200: { description: "Subscriptions list" } },
        },
      },
      use: [
        razorpaySessionMiddleware,
        referenceMiddleware(subscriptionOptions, "list-subscription"),
      ],
    },
    async (ctx) => {
      const session = ctx.context.session;
      const user = session.user as typeof session.user & WithRazorpayCustomerId;
      const customerType = ctx.query?.customerType || "user";
      const referenceId =
        ctx.query?.referenceId ||
        (customerType === "organization"
          ? session.session.activeOrganizationId
          : user.id);

      if (!referenceId) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.ORGANIZATION_REFERENCE_ID_REQUIRED,
        );
      }

      const subscriptions = await ctx.context.adapter.findMany<Subscription>({
        model: "subscription",
        where: [{ field: "referenceId", value: referenceId }],
      });

      return ctx.json(subscriptions);
    },
  );
};

/**
 * POST /subscription/update
 *
 * Update an existing subscription (plan change, quantity, etc).
 */
export const updateSubscription = (options: RazorpayOptions) => {
  if (!options.subscription?.enabled) {
    throw new Error("Subscriptions must be enabled");
  }
  const subscriptionOptions = options.subscription;
  return createAuthEndpoint(
    "/subscription/update",
    {
      method: "POST",
      body: updateSubscriptionBodySchema,
      metadata: {
        openapi: {
          summary: "Update subscription",
          description: "Update a Razorpay subscription (plan, quantity, etc.)",
          responses: { 200: { description: "Subscription updated" } },
        },
      },
      use: [
        razorpaySessionMiddleware,
        referenceMiddleware(subscriptionOptions, "update-subscription"),
      ],
    },
    async (ctx) => {
      const session = ctx.context.session;
      const user = session.user as typeof session.user & WithRazorpayCustomerId;
      const customerType = ctx.body.customerType || "user";
      const referenceId =
        ctx.body.referenceId ||
        (customerType === "organization"
          ? session.session.activeOrganizationId
          : user.id);

      if (!referenceId) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.ORGANIZATION_REFERENCE_ID_REQUIRED,
        );
      }

      const subscription = await ctx.context.adapter.findOne<Subscription>({
        model: "subscription",
        where: [{ field: "referenceId", value: referenceId }],
      });

      if (!subscription?.razorpaySubscriptionId) {
        throw createAPIError(
          "NOT_FOUND",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
        );
      }

      try {
        const client = options.razorpayClient;
        const updateParams: Record<string, unknown> = {};

        if (ctx.body.planId) updateParams.plan_id = ctx.body.planId;
        if (ctx.body.quantity !== undefined)
          updateParams.quantity = ctx.body.quantity;
        if (ctx.body.remainingCount !== undefined)
          updateParams.remaining_count = ctx.body.remainingCount;
        if (ctx.body.scheduleChangeAt)
          updateParams.schedule_change_at = ctx.body.scheduleChangeAt;

        const razorpaySub = await (client.subscriptions as any).update(
          subscription.razorpaySubscriptionId,
          updateParams,
        );

        const updated = await ctx.context.adapter.update<Subscription>({
          model: "subscription",
          update: {
            ...(ctx.body.planId ? { razorpayPlanId: ctx.body.planId } : {}),
            ...(ctx.body.quantity !== undefined
              ? { quantity: ctx.body.quantity }
              : {}),
            updatedAt: new Date(),
          },
          where: [{ field: "id", value: subscription.id }],
        });

        return ctx.json({
          subscription: updated || subscription,
          razorpaySubscription: razorpaySub,
        });
      } catch (error: any) {
        ctx.context.logger.error(
          `Failed to update subscription: ${error.message}`,
        );
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_UPDATE_FAILED,
        );
      }
    },
  );
};

// ─── Razorpay-Specific Endpoints ─────────────────────────────────────────────

/**
 * GET /razorpay/subscription/get
 *
 * Fetch a subscription by its Razorpay ID.
 */
export const fetchSubscription = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/subscription/get",
    {
      method: "GET",
      query: fetchSubscriptionQuerySchema,
      metadata: {
        openapi: {
          summary: "Fetch subscription",
          description: "Fetch a Razorpay subscription by ID",
          responses: { 200: { description: "Subscription details" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const razorpaySub = await (client.subscriptions as any).fetch(
          ctx.query.subscriptionId,
        );
        return ctx.json(razorpaySub);
      } catch (error: any) {
        ctx.context.logger.error(
          `Failed to fetch subscription: ${error.message}`,
        );
        throw createAPIError(
          "NOT_FOUND",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
        );
      }
    },
  );
};

/**
 * POST /razorpay/subscription-link
 *
 * Create a subscription link for customer authorization.
 */
export const createSubscriptionLink = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/subscription-link",
    {
      method: "POST",
      body: subscriptionLinkBodySchema,
      metadata: {
        openapi: {
          summary: "Create subscription link",
          description: "Create a Razorpay subscription link",
          responses: { 200: { description: "Subscription link created" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const razorpaySub = await (client.subscriptions as any).create({
          plan_id: ctx.body.planId,
          total_count: ctx.body.totalCount,
          quantity: ctx.body.quantity || 1,
          expire_by: ctx.body.expireBy,
          customer_notify: ctx.body.customerNotify ?? true,
          notes: ctx.body.notes || {},
        });

        return ctx.json({
          subscriptionId: razorpaySub.id,
          shortUrl: razorpaySub.short_url,
          razorpaySubscription: razorpaySub,
        });
      } catch (error: any) {
        ctx.context.logger.error(
          `Failed to create subscription link: ${error.message}`,
        );
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.SUBSCRIPTION_LINK_CREATE_FAILED,
        );
      }
    },
  );
};

/**
 * GET /razorpay/subscription/pending-update
 *
 * Fetch pending update details for a subscription.
 */
export const fetchPendingUpdate = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/subscription/pending-update",
    {
      method: "GET",
      query: pendingUpdateQuerySchema,
      metadata: {
        openapi: {
          summary: "Fetch pending update",
          description: "Fetch details of a pending subscription update",
          responses: { 200: { description: "Pending update details" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const result = await (client.subscriptions as any).pendingUpdate(
          ctx.query.subscriptionId,
        );
        return ctx.json(result);
      } catch (error: any) {
        ctx.context.logger.error(
          `Failed to fetch pending update: ${error.message}`,
        );
        throw createAPIError(
          "NOT_FOUND",
          RAZORPAY_ERROR_CODES.PENDING_UPDATE_NOT_FOUND,
        );
      }
    },
  );
};

/**
 * POST /razorpay/subscription/cancel-update
 *
 * Cancel a pending subscription update.
 */
export const cancelPendingUpdate = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/subscription/cancel-update",
    {
      method: "POST",
      body: cancelUpdateBodySchema,
      metadata: {
        openapi: {
          summary: "Cancel pending update",
          description: "Cancel a pending subscription update",
          responses: { 200: { description: "Update cancelled" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const result = await (
          client.subscriptions as any
        ).cancelScheduledChanges(ctx.body.subscriptionId);
        return ctx.json(result);
      } catch (error: any) {
        ctx.context.logger.error(
          `Failed to cancel pending update: ${error.message}`,
        );
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.PENDING_UPDATE_CANCEL_FAILED,
        );
      }
    },
  );
};

/**
 * GET /razorpay/subscription/invoices
 *
 * Fetch all invoices for a subscription.
 */
export const fetchInvoices = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/subscription/invoices",
    {
      method: "GET",
      query: invoicesQuerySchema,
      metadata: {
        openapi: {
          summary: "Fetch invoices",
          description: "Fetch all invoices for a Razorpay subscription",
          responses: { 200: { description: "Invoice list" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const invoices = await (client.invoices as any).all({
          subscription_id: ctx.query.subscriptionId,
        });
        return ctx.json(invoices);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to fetch invoices: ${error.message}`);
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.INVOICE_FETCH_FAILED,
        );
      }
    },
  );
};

/**
 * POST /razorpay/subscription/link-offer
 *
 * Link an offer to a subscription.
 */
export const linkOffer = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/subscription/link-offer",
    {
      method: "POST",
      body: linkOfferBodySchema,
      metadata: {
        openapi: {
          summary: "Link offer",
          description: "Link an offer to a Razorpay subscription",
          responses: { 200: { description: "Offer linked" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const result = await (client.subscriptions as any).update(
          ctx.body.subscriptionId,
          { offer_id: ctx.body.offerId },
        );
        return ctx.json(result);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to link offer: ${error.message}`);
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.OFFER_LINK_FAILED,
        );
      }
    },
  );
};

/**
 * POST /razorpay/subscription/delete-offer
 *
 * Delete/unlink an offer from a subscription.
 */
export const deleteOffer = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/subscription/delete-offer",
    {
      method: "POST",
      body: deleteOfferBodySchema,
      metadata: {
        openapi: {
          summary: "Delete offer",
          description: "Remove an offer from a Razorpay subscription",
          responses: { 200: { description: "Offer deleted" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const result = await (client.subscriptions as any).deleteOffer(
          ctx.body.subscriptionId,
          ctx.body.offerId,
        );
        return ctx.json(result);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to delete offer: ${error.message}`);
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.OFFER_DELETE_FAILED,
        );
      }
    },
  );
};

// ─── Plan Endpoints ──────────────────────────────────────────────────────────

/**
 * POST /razorpay/plan/create
 *
 * Create a new Razorpay plan.
 */
export const createPlan = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/plan/create",
    {
      method: "POST",
      body: createPlanBodySchema,
      metadata: {
        openapi: {
          summary: "Create plan",
          description: "Create a new Razorpay plan",
          responses: { 200: { description: "Plan created" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const plan = await (client.plans as any).create({
          period: ctx.body.period,
          interval: ctx.body.interval,
          item: {
            name: ctx.body.itemName,
            amount: ctx.body.itemAmount,
            currency: ctx.body.itemCurrency,
            description: ctx.body.itemDescription,
          },
          notes: ctx.body.notes || {},
        });
        return ctx.json(plan);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to create plan: ${error.message}`);
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.PLAN_CREATE_FAILED,
        );
      }
    },
  );
};

/**
 * GET /razorpay/plan/list
 *
 * Fetch all Razorpay plans.
 */
export const listPlans = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/plan/list",
    {
      method: "GET",
      metadata: {
        openapi: {
          summary: "List plans",
          description: "Fetch all Razorpay plans",
          responses: { 200: { description: "Plans list" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const plans = await (client.plans as any).all();
        return ctx.json(plans);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to list plans: ${error.message}`);
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.FAILED_TO_FETCH_PLANS,
        );
      }
    },
  );
};

/**
 * GET /razorpay/plan/get
 *
 * Fetch a Razorpay plan by ID.
 */
export const fetchPlan = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/plan/get",
    {
      method: "GET",
      query: fetchPlanQuerySchema,
      metadata: {
        openapi: {
          summary: "Fetch plan",
          description: "Fetch a Razorpay plan by ID",
          responses: { 200: { description: "Plan details" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const plan = await (client.plans as any).fetch(ctx.query.planId);
        return ctx.json(plan);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to fetch plan: ${error.message}`);
        throw createAPIError("NOT_FOUND", RAZORPAY_ERROR_CODES.PLAN_NOT_FOUND);
      }
    },
  );
};

// ─── Customer Endpoints ──────────────────────────────────────────────────────

/**
 * POST /razorpay/customer/create
 *
 * Create a new Razorpay customer.
 */
export const createCustomer = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/customer/create",
    {
      method: "POST",
      body: createCustomerBodySchema,
      metadata: {
        openapi: {
          summary: "Create customer",
          description: "Create a new Razorpay customer",
          responses: { 200: { description: "Customer created" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const customer = await (client.customers as any).create({
          name: ctx.body.name,
          email: ctx.body.email,
          contact: ctx.body.contact,
          fail_existing: ctx.body.failExisting ? "1" : "0",
          gstin: ctx.body.gstin,
          notes: ctx.body.notes || {},
        });
        return ctx.json(customer);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to create customer: ${error.message}`);
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.UNABLE_TO_CREATE_CUSTOMER,
        );
      }
    },
  );
};

/**
 * POST /razorpay/customer/edit
 *
 * Edit a Razorpay customer.
 */
export const editCustomer = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/customer/edit",
    {
      method: "POST",
      body: editCustomerBodySchema,
      metadata: {
        openapi: {
          summary: "Edit customer",
          description: "Edit a Razorpay customer",
          responses: { 200: { description: "Customer updated" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const updateParams: Record<string, unknown> = {};
        if (ctx.body.name) updateParams.name = ctx.body.name;
        if (ctx.body.email) updateParams.email = ctx.body.email;
        if (ctx.body.contact) updateParams.contact = ctx.body.contact;
        if (ctx.body.gstin) updateParams.gstin = ctx.body.gstin;
        if (ctx.body.notes) updateParams.notes = ctx.body.notes;

        const customer = await (client.customers as any).edit(
          ctx.body.customerId,
          updateParams,
        );
        return ctx.json(customer);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to edit customer: ${error.message}`);
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.CUSTOMER_EDIT_FAILED,
        );
      }
    },
  );
};

/**
 * GET /razorpay/customer/list
 *
 * Fetch all Razorpay customers.
 */
export const listCustomers = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/customer/list",
    {
      method: "GET",
      metadata: {
        openapi: {
          summary: "List customers",
          description: "Fetch all Razorpay customers",
          responses: { 200: { description: "Customers list" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const customers = await (client.customers as any).all();
        return ctx.json(customers);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to list customers: ${error.message}`);
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.CUSTOMER_NOT_FOUND,
        );
      }
    },
  );
};

/**
 * GET /razorpay/customer/get
 *
 * Fetch a Razorpay customer by ID.
 */
export const fetchCustomer = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/customer/get",
    {
      method: "GET",
      query: fetchCustomerQuerySchema,
      metadata: {
        openapi: {
          summary: "Fetch customer",
          description: "Fetch a Razorpay customer by ID",
          responses: { 200: { description: "Customer details" } },
        },
      },
      use: [razorpaySessionMiddleware],
    },
    async (ctx) => {
      try {
        const client = options.razorpayClient;
        const customer = await (client.customers as any).fetch(
          ctx.query.customerId,
        );
        return ctx.json(customer);
      } catch (error: any) {
        ctx.context.logger.error(`Failed to fetch customer: ${error.message}`);
        throw createAPIError(
          "NOT_FOUND",
          RAZORPAY_ERROR_CODES.CUSTOMER_NOT_FOUND,
        );
      }
    },
  );
};

// ─── Webhook ─────────────────────────────────────────────────────────────────

/**
 * POST /razorpay/webhook
 *
 * Handle Razorpay webhook events.
 * Verifies HMAC-SHA256 signature before processing.
 */
export const razorpayWebhook = (options: RazorpayOptions) => {
  return createAuthEndpoint(
    "/razorpay/webhook",
    {
      method: "POST",
      metadata: {
        isAction: false,
        openapi: {
          summary: "Razorpay webhook handler",
          description:
            "Handles incoming Razorpay webhook events with HMAC-SHA256 signature verification",
          responses: {
            200: { description: "Webhook processed" },
          },
        },
      },
    },
    async (ctx) => {
      const webhookSecret = options.razorpayWebhookSecret;
      if (!webhookSecret) {
        throw createAPIError(
          "INTERNAL_SERVER_ERROR",
          RAZORPAY_ERROR_CODES.WEBHOOK_SECRET_NOT_FOUND,
        );
      }

      // Get signature from header
      const signature = ctx.request?.headers?.get("x-razorpay-signature");
      if (!signature) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.WEBHOOK_SIGNATURE_NOT_FOUND,
        );
      }

      // Get raw body
      let rawBody: string;
      try {
        rawBody = await ctx.request!.text();
      } catch {
        // If body was already consumed, try to get it from ctx.body
        rawBody = JSON.stringify(ctx.body);
      }

      // Verify HMAC-SHA256 signature
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );

      if (!isValid) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.FAILED_TO_VERIFY_WEBHOOK,
        );
      }

      let event: RazorpayWebhookEvent;
      try {
        event = JSON.parse(rawBody) as RazorpayWebhookEvent;
      } catch {
        throw createAPIError("BAD_REQUEST", RAZORPAY_ERROR_CODES.WEBHOOK_ERROR);
      }

      // Call optional generic event handler
      await options.onEvent?.(event);

      // Route to specific handler
      switch (event.event) {
        case "subscription.authenticated":
          await onSubscriptionAuthenticated(ctx, options, event);
          break;
        case "subscription.activated":
          await onSubscriptionActivated(ctx, options, event);
          break;
        case "subscription.charged":
          await onSubscriptionCharged(ctx, options, event);
          break;
        case "subscription.pending":
          await onSubscriptionPending(ctx, options, event);
          break;
        case "subscription.halted":
          await onSubscriptionHalted(ctx, options, event);
          break;
        case "subscription.completed":
          await onSubscriptionCompleted(ctx, options, event);
          break;
        case "subscription.updated":
          await onSubscriptionUpdated(ctx, options, event);
          break;
        case "subscription.paused":
          await onSubscriptionPaused(ctx, options, event);
          break;
        case "subscription.resumed":
          await onSubscriptionResumed(ctx, options, event);
          break;
        case "subscription.cancelled":
          await onSubscriptionCancelled(ctx, options, event);
          break;
        default:
          ctx.context.logger.info(
            `Razorpay webhook: Unhandled event type: ${event.event}`,
          );
      }

      return ctx.json({ received: true });
    },
  );
};
