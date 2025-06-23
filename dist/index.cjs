'use strict';

const betterAuth = require('better-auth');
const api = require('better-auth/api');
const plugins = require('better-auth/plugins');
const razorpayUtils = require('razorpay/dist/utils/razorpay-utils');
const zod = require('zod');
const db = require('better-auth/db');

async function getPlans(options) {
  if (!options.subscription?.plans) {
    return [];
  }
  return typeof options.subscription.plans === "function" ? await options.subscription.plans() : options.subscription.plans;
}
async function getPlanByName(options, name) {
  return await getPlans(options).then(
    (res) => res?.find((plan) => plan.name.toLowerCase() === name.toLowerCase())
  );
}
async function getPlanByRazorpayId(options, razorpayPlanId) {
  return await getPlans(options).then(
    (res) => res?.find(
      (plan) => plan.monthlyPlanId === razorpayPlanId || plan.annualPlanId === razorpayPlanId
    )
  );
}

async function onSubscriptionActivated(ctx, options, event) {
  try {
    if (!options.subscription?.enabled) return;
    const razorpaySubscription = event.payload.subscription.entity;
    const plan = await getPlanByRazorpayId(
      options,
      razorpaySubscription.plan_id
    );
    if (!plan) {
      betterAuth.logger.warn(
        `Razorpay webhook: Plan not found for Razorpay Plan ID: ${razorpaySubscription.plan_id}`
      );
      return;
    }
    let dbSubscription = await ctx.context.adapter.findOne({
      model: "subscription",
      where: [
        { field: "razorpaySubscriptionId", value: razorpaySubscription.id }
      ]
    });
    if (!dbSubscription) {
      betterAuth.logger.error(
        `Razorpay webhook: Could not find a matching DB subscription for ID: ${razorpaySubscription.id}`
      );
      return;
    }
    const trial = razorpaySubscription.trial_start && razorpaySubscription.trial_end ? {
      trialStart: new Date(razorpaySubscription.trial_start * 1e3),
      trialEnd: new Date(razorpaySubscription.trial_end * 1e3)
    } : {};
    await ctx.context.adapter.update({
      model: "subscription",
      where: [{ field: "id", value: dbSubscription.id }],
      update: {
        status: razorpaySubscription.status,
        periodStart: razorpaySubscription.current_start ? new Date(razorpaySubscription.current_start * 1e3) : void 0,
        periodEnd: razorpaySubscription.current_end ? new Date(razorpaySubscription.current_end * 1e3) : void 0,
        ...trial
      }
    });
    const updatedSubscription = await ctx.context.adapter.findOne(
      {
        model: "subscription",
        where: [{ field: "id", value: dbSubscription.id }]
      }
    );
    if (!updatedSubscription) {
      betterAuth.logger.error(
        `Razorpay webhook: Failed to find subscription after updating it: ${dbSubscription.id}`
      );
      return;
    }
    if (trial.trialStart && plan.freeTrial?.onTrialStart) {
      await plan.freeTrial.onTrialStart(updatedSubscription);
    }
    await options.subscription?.onSubscriptionActivated?.({
      event,
      subscription: updatedSubscription,
      razorpaySubscription,
      plan
    });
  } catch (e) {
    betterAuth.logger.error(
      `Razorpay webhook 'subscription.activated' failed. Error: ${e.message}`
    );
  }
}
async function onSubscriptionUpdated(ctx, options, event) {
  try {
    if (!options.subscription?.enabled) return;
    const razorpaySubscription = event.payload.subscription.entity;
    const subscription = await ctx.context.adapter.findOne({
      model: "subscription",
      where: [
        { field: "razorpaySubscriptionId", value: razorpaySubscription.id }
      ]
    });
    if (!subscription) {
      betterAuth.logger.warn(
        `Razorpay webhook 'updated': Subscription not found for ID: ${razorpaySubscription.id}`
      );
      return;
    }
    const subscriptionNewlyCancelled = razorpaySubscription.cancel_at_cycle_end === true && !subscription.cancelAtPeriodEnd;
    await ctx.context.adapter.update({
      model: "subscription",
      where: [{ field: "id", value: subscription.id }],
      update: {
        status: razorpaySubscription.status,
        cancelAtPeriodEnd: razorpaySubscription.cancel_at_cycle_end,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    if (subscriptionNewlyCancelled) {
      await options.subscription.onSubscriptionCancel?.({
        event,
        razorpaySubscription,
        subscription
      });
    }
    await options.subscription.onSubscriptionUpdate?.({
      event,
      subscription
    });
  } catch (e) {
    betterAuth.logger.error(
      `Razorpay webhook 'subscription.updated' failed. Error: ${e.message}`
    );
  }
}
async function onSubscriptionCancelled(ctx, options, event) {
  try {
    if (!options.subscription?.enabled) return;
    const razorpaySubscription = event.payload.subscription.entity;
    const subscription = await ctx.context.adapter.findOne({
      model: "subscription",
      where: [
        { field: "razorpaySubscriptionId", value: razorpaySubscription.id }
      ]
    });
    if (subscription) {
      await ctx.context.adapter.update({
        model: "subscription",
        where: [{ field: "id", value: subscription.id }],
        update: {
          status: "cancelled",
          updatedAt: /* @__PURE__ */ new Date(),
          cancelAtPeriodEnd: false
        }
      });
      await options.subscription?.onSubscriptionCancel?.({
        event,
        razorpaySubscription,
        subscription
      });
    } else {
      betterAuth.logger.warn(
        `Razorpay webhook 'cancelled': Subscription not found for ID: ${razorpaySubscription.id}`
      );
    }
  } catch (e) {
    betterAuth.logger.error(
      `Razorpay webhook 'subscription.cancelled' failed. Error: ${e.message}`
    );
  }
}

const subscriptions = {
  subscription: {
    fields: {
      plan: {
        type: "string",
        required: true
      },
      referenceId: {
        type: "string",
        required: true
      },
      razorpayCustomerId: {
        type: "string",
        required: false
      },
      razorpaySubscriptionId: {
        type: "string",
        required: false
      },
      status: {
        type: "string",
        // 'created' is the initial status in Razorpay before payment.
        defaultValue: "created"
      },
      periodStart: {
        type: "date",
        required: false
      },
      periodEnd: {
        type: "date",
        required: false
      },
      cancelAtPeriodEnd: {
        type: "boolean",
        required: false,
        defaultValue: false
      },
      seats: {
        type: "number",
        required: false
      },
      trialStart: {
        type: "date",
        required: false
      },
      trialEnd: {
        type: "date",
        required: false
      },
      groupId: {
        type: "string",
        required: false
      }
    }
  }
};
const user = {
  user: {
    fields: {
      razorpayCustomerId: {
        type: "string",
        required: false
      }
    }
  }
};
const getSchema = (options) => {
  if (options.schema && !options.subscription?.enabled && "subscription" in options.schema) {
    options.schema.subscription = void 0;
  }
  return db.mergeSchema(
    {
      // Only include the subscription table if the feature is enabled.
      ...options.subscription?.enabled ? subscriptions : {},
      ...user
    },
    options.schema
  );
};

const RAZORPAY_ERROR_CODES = {
  SUBSCRIPTION_NOT_FOUND: "Subscription not found",
  SUBSCRIPTION_PLAN_NOT_FOUND: "Subscription plan not found",
  ALREADY_SUBSCRIBED_PLAN: "You're already subscribed to this plan",
  UNABLE_TO_CREATE_CUSTOMER: "Unable to create customer",
  EMAIL_VERIFICATION_REQUIRED: "Email verification is required before you can subscribe to a plan",
  SUBSCRIPTION_NOT_CANCELLABLE: "Subscription cannot be cancelled",
  SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION: "Subscription is not scheduled for cancellation"
  // Add any other Razorpay specific error messages if needed
};
const getUrl = (ctx, url) => {
  if (url.startsWith("http")) {
    return url;
  }
  const baseURL = ctx.context.options.baseURL;
  if (!baseURL) {
    betterAuth.logger.error(
      "baseURL is not configured in better-auth options. Cannot construct URL."
    );
    return url.startsWith("/") ? url : `/${url}`;
  }
  return `${baseURL}${url.startsWith("/") ? url : `/${url}`}`;
};
const razorpay = (options) => {
  const client = options.razorpayClient;
  const referenceMiddleware = (action) => plugins.createAuthMiddleware(async (ctx) => {
    const session = ctx.context.session;
    if (!session) throw new api.APIError("UNAUTHORIZED");
    const referenceId = ctx.body?.referenceId || ctx.query?.referenceId || session.user.id;
    if (ctx.body?.referenceId && !options.subscription?.authorizeReference) {
      betterAuth.logger.error(
        `Passing 'referenceId' is not allowed if 'subscription.authorizeReference' is not defined.`
      );
      throw new api.APIError("BAD_REQUEST", {
        message: "Reference ID is not allowed. See server logs."
      });
    }
    const isAuthorized = ctx.body?.referenceId || ctx.query?.referenceId ? await options.subscription?.authorizeReference?.({
      user: session.user,
      session: session.session,
      referenceId,
      action
    }) : true;
    if (!isAuthorized) throw new api.APIError("UNAUTHORIZED");
  });
  const subscriptionEndpoints = {
    /**
     * Creates a new subscription or updates an existing one (upgrade/downgrade).
     * This is the Razorpay equivalent of Stripe's `upgradeSubscription` endpoint.
     */
    createOrUpdateSubscription: plugins.createAuthEndpoint(
      "/subscription/create-or-update",
      {
        method: "POST",
        body: zod.z.object({
          plan: zod.z.string(),
          annual: zod.z.boolean().optional(),
          referenceId: zod.z.string().optional(),
          subscriptionId: zod.z.string().optional(),
          // Local DB ID of the subscription to update
          seats: zod.z.number().optional().default(1),
          successUrl: zod.z.string().default("/"),
          // For new subscriptions redirecting to Razorpay checkout
          // cancelUrl: z.string().default("/"), // Razorpay checkout uses its own cancel, less relevant here
          // returnUrl: z.string().optional(), // More for Stripe's Billing Portal; Razorpay uses callback_url
          disableRedirect: zod.z.boolean().default(false)
          // For new subscriptions
        }),
        // originCheck is less directly applicable here as Razorpay's checkout is a full redirect.
        // Security is handled by webhook verification and session state.
        use: [api.sessionMiddleware, referenceMiddleware("create-subscription")]
      },
      async (ctx) => {
        const { user, session } = ctx.context.session;
        if (!user.emailVerified && options.subscription?.requireEmailVerification) {
          throw new api.APIError("BAD_REQUEST", {
            message: RAZORPAY_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED
          });
        }
        const referenceId = ctx.body.referenceId || user.id;
        const plan = await getPlanByName(options, ctx.body.plan);
        if (!plan)
          throw new api.APIError("NOT_FOUND", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_PLAN_NOT_FOUND
          });
        const planIdToUse = ctx.body.annual ? plan.annualPlanId : plan.monthlyPlanId;
        if (!planIdToUse) {
          const billingCycle = ctx.body.annual ? "annual" : "monthly";
          throw new api.APIError("BAD_REQUEST", {
            message: `The ${billingCycle} pricing for plan '${plan.name}' is not configured.`
          });
        }
        const subscriptions = await ctx.context.adapter.findMany({
          model: "subscription",
          where: [{ field: "referenceId", value: referenceId }]
        });
        const existingSubscription = ctx.body.subscriptionId ? subscriptions.find((sub) => sub.id === ctx.body.subscriptionId) : subscriptions.find(
          (sub) => (sub.status === "active" || sub.status === "trialing") && sub.groupId === plan.group
        );
        if (existingSubscription?.razorpaySubscriptionId) {
          if (existingSubscription.plan === plan.name.toLowerCase() && existingSubscription.seats === ctx.body.seats) {
            throw new api.APIError("BAD_REQUEST", {
              message: RAZORPAY_ERROR_CODES.ALREADY_SUBSCRIBED_PLAN
            });
          }
          const updatedRzpSub = await client.subscriptions.update(
            // Changed 'upgrade' to 'update'
            existingSubscription.razorpaySubscriptionId,
            {
              plan_id: planIdToUse,
              quantity: ctx.body.seats,
              schedule_change_at: "now"
              // Apply changes immediately
            }
          );
          await ctx.context.adapter.update({
            model: "subscription",
            where: [{ field: "id", value: existingSubscription.id }],
            update: {
              plan: plan.name.toLowerCase(),
              seats: ctx.body.seats,
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          return ctx.json({ ...updatedRzpSub, redirect: false });
        }
        let customerId = user.razorpayCustomerId;
        if (!customerId) {
          try {
            const rzpCustomer = await client.customers.create({
              email: user.email,
              name: user.name || void 0,
              fail_existing: 0
            });
            await ctx.context.adapter.update({
              model: "user",
              update: { razorpayCustomerId: rzpCustomer.id },
              where: [{ field: "id", value: user.id }]
            });
            customerId = rzpCustomer.id;
          } catch (e) {
            betterAuth.logger.error(
              `Razorpay: Failed to create customer for ${user.email}: ${e.message}`
            );
            throw new api.APIError("INTERNAL_SERVER_ERROR", {
              message: RAZORPAY_ERROR_CODES.UNABLE_TO_CREATE_CUSTOMER
            });
          }
        }
        const userHookParams = await options.subscription?.getSubscriptionCreateParams?.({
          user,
          session,
          plan,
          subscription: void 0
        });
        const trialParams = plan.freeTrial ? {
          start_at: Math.floor(
            Date.now() / 1e3 + plan.freeTrial.days * 24 * 60 * 60
          )
        } : {};
        const rzpSubscriptionPayload = {
          plan_id: planIdToUse,
          customer_id: customerId,
          total_count: 120,
          // For long-running subscriptions
          quantity: ctx.body.seats,
          ...trialParams,
          ...userHookParams?.params || {}
        };
        rzpSubscriptionPayload.notes = {
          referenceId,
          userId: user.id,
          ...userHookParams?.params?.notes || {}
        };
        const rzpSub = await client.subscriptions.create(
          rzpSubscriptionPayload
        );
        const newDbSub = await ctx.context.adapter.create({
          model: "subscription",
          data: {
            plan: plan.name.toLowerCase(),
            razorpayCustomerId: customerId,
            razorpaySubscriptionId: rzpSub.id,
            status: "created",
            referenceId,
            seats: ctx.body.seats,
            groupId: plan.group
          }
        });
        if (!newDbSub) {
          try {
            await client.subscriptions.cancel(rzpSub.id, true);
          } catch (cancelError) {
            betterAuth.logger.error(
              `CRITICAL: Failed to cancel orphaned Razorpay subscription ${rzpSub.id}: ${cancelError.message}`
            );
          }
          throw new api.APIError("INTERNAL_SERVER_ERROR", {
            message: "Failed to create local subscription record."
          });
        }
        const successCallbackUrl = getUrl(
          ctx,
          `/api/auth/razorpay/subscription/success?callbackURL=${encodeURIComponent(
            ctx.body.successUrl
          )}&subscriptionId=${encodeURIComponent(
            newDbSub.id
          )}&rzp_sub_id=${encodeURIComponent(rzpSub.id)}`
        );
        return ctx.json({
          ...rzpSub,
          checkoutUrl: `${rzpSub.short_url}&callback_url=${encodeURIComponent(
            successCallbackUrl
          )}`,
          redirect: !ctx.body.disableRedirect
        });
      }
    ),
    /**
     * Callback endpoint after user cancels via a Razorpay-hosted page (if such a flow is used).
     * This mirrors Stripe's `cancelSubscriptionCallback`. Razorpay's direct subscription management
     * often doesn't involve a redirect-based cancel flow like Stripe's Billing Portal.
     * This endpoint is kept for structural parity; its direct applicability depends on
     * how cancellations are initiated (API vs. potential future Razorpay portal).
     * For API-initiated cancellations, webhooks are primary.
     */
    cancelSubscriptionCallback: plugins.createAuthEndpoint(
      "/subscription/cancel/callback",
      // Path kept for structural parity
      {
        method: "GET",
        // Assuming a GET redirect if this flow exists
        query: zod.z.record(zod.z.string(), zod.z.any()).optional(),
        // originCheck might be relevant if it's a redirect from a trusted Razorpay domain
        use: [api.originCheck((c) => [c.query?.callbackURL])]
      },
      async (ctx) => {
        const {
          callbackURL,
          subscriptionId: localSubscriptionId
        } = ctx.query ?? {};
        if (!callbackURL || !localSubscriptionId) {
          return ctx.redirect(getUrl(ctx, callbackURL || "/"));
        }
        betterAuth.logger.info(
          `cancelSubscriptionCallback invoked for localSubId ${localSubscriptionId}. Redirecting to ${callbackURL}.`
        );
        return ctx.redirect(getUrl(ctx, callbackURL));
      }
    ),
    /**
     * Cancels a subscription via API.
     */
    cancelSubscription: plugins.createAuthEndpoint(
      "/subscription/cancel",
      {
        method: "POST",
        body: zod.z.object({
          subscriptionId: zod.z.string(),
          // Local DB subscription ID
          referenceId: zod.z.string().optional(),
          // For authorization
          immediately: zod.z.boolean().default(false)
          // returnUrl: z.string(), // Less relevant for API-only cancel, Stripe uses for billing portal
        }),
        use: [api.sessionMiddleware, referenceMiddleware("cancel-subscription")]
      },
      async (ctx) => {
        const { subscriptionId, immediately } = ctx.body;
        const subscription = await ctx.context.adapter.findOne({
          model: "subscription",
          where: [{ field: "id", value: subscriptionId }]
        });
        if (!subscription || !subscription.razorpaySubscriptionId)
          throw new api.APIError("NOT_FOUND", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND
          });
        if (subscription.status !== "active" && subscription.status !== "trialing") {
          throw new api.APIError("BAD_REQUEST", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_CANCELLABLE
          });
        }
        const cancelledRzpSub = await client.subscriptions.cancel(
          subscription.razorpaySubscriptionId,
          !immediately
        );
        await ctx.context.adapter.update({
          model: "subscription",
          update: {
            cancelAtPeriodEnd: !immediately,
            status: immediately ? "cancelled" : subscription.status,
            updatedAt: /* @__PURE__ */ new Date()
          },
          where: [{ field: "id", value: subscription.id }]
        });
        return ctx.json(cancelledRzpSub);
      }
    ),
    /**
     * Restores a subscription that was scheduled for cancellation at period end.
     */
    restoreSubscription: plugins.createAuthEndpoint(
      "/subscription/restore",
      {
        method: "POST",
        body: zod.z.object({
          subscriptionId: zod.z.string(),
          // Local DB subscription ID
          referenceId: zod.z.string().optional()
          // For authorization
        }),
        use: [api.sessionMiddleware, referenceMiddleware("restore-subscription")]
      },
      async (ctx) => {
        const { subscriptionId } = ctx.body;
        const subscription = await ctx.context.adapter.findOne({
          model: "subscription",
          where: [{ field: "id", value: subscriptionId }]
        });
        if (!subscription || !subscription.razorpaySubscriptionId)
          throw new api.APIError("NOT_FOUND", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND
          });
        if (!subscription.cancelAtPeriodEnd) {
          throw new api.APIError("BAD_REQUEST", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION
          });
        }
        const restoredRzpSub = await client.subscriptions.cancelScheduledChanges(
          subscription.razorpaySubscriptionId
        );
        await ctx.context.adapter.update({
          model: "subscription",
          update: { cancelAtPeriodEnd: false, updatedAt: /* @__PURE__ */ new Date() },
          where: [{ field: "id", value: subscription.id }]
        });
        return ctx.json(restoredRzpSub);
      }
    ),
    /**
     * Lists active and trialing subscriptions for the referenceId.
     */
    listActiveSubscriptions: plugins.createAuthEndpoint(
      "/subscription/list",
      {
        method: "GET",
        query: zod.z.optional(zod.z.object({ referenceId: zod.z.string().optional() })),
        use: [api.sessionMiddleware, referenceMiddleware("list-subscription")]
      },
      async (ctx) => {
        const referenceId = ctx.query?.referenceId || ctx.context.session.user.id;
        const allSubscriptions = await ctx.context.adapter.findMany({
          model: "subscription",
          where: [{ field: "referenceId", value: referenceId }]
        });
        if (!allSubscriptions.length) return ctx.json([]);
        const plans = await getPlans(options);
        const activeSubs = allSubscriptions.map((sub) => {
          const plan = plans.find(
            (p) => p.name.toLowerCase() === sub.plan.toLowerCase() && p.group === sub.groupId
          );
          return { ...sub, limits: plan?.limits };
        }).filter(
          (sub) => sub.status === "active" || sub.status === "trialing"
        );
        return ctx.json(activeSubs);
      }
    ),
    /**
     * Callback endpoint after successful Razorpay checkout. Updates local DB for immediate UX.
     */
    subscriptionSuccess: plugins.createAuthEndpoint(
      "/subscription/success",
      {
        method: "GET",
        query: zod.z.record(zod.z.string(), zod.z.any()).optional(),
        use: [api.originCheck((c) => [c.query?.callbackURL])]
        // Check origin of the callback redirect
      },
      async (ctx) => {
        const {
          callbackURL,
          subscriptionId: localSubscriptionId,
          rzp_sub_id: rzpSubscriptionIdFromQuery
        } = ctx.query ?? {};
        if (!callbackURL || !localSubscriptionId) {
          betterAuth.logger.warn(
            "Razorpay success callback: Missing callbackURL or localSubscriptionId."
          );
          return ctx.redirect(getUrl(ctx, callbackURL || "/"));
        }
        const dbSubscription = await ctx.context.adapter.findOne({
          model: "subscription",
          where: [{ field: "id", value: localSubscriptionId }]
        });
        if (!dbSubscription || !dbSubscription.razorpaySubscriptionId) {
          betterAuth.logger.warn(
            `Razorpay success callback: DB subscription not found for local ID ${localSubscriptionId} or missing Razorpay ID.`
          );
          return ctx.redirect(getUrl(ctx, callbackURL));
        }
        if (dbSubscription.status === "active" || dbSubscription.status === "trialing") {
          betterAuth.logger.info(
            `Razorpay success callback: DB subscription ${localSubscriptionId} already active/trialing.`
          );
          return ctx.redirect(getUrl(ctx, callbackURL));
        }
        if (rzpSubscriptionIdFromQuery && dbSubscription.razorpaySubscriptionId !== rzpSubscriptionIdFromQuery) {
          betterAuth.logger.error(
            `CRITICAL: Razorpay subscription ID mismatch in success callback. DB: ${dbSubscription.razorpaySubscriptionId}, Query: ${rzpSubscriptionIdFromQuery}. Investigate immediately.`
          );
          return ctx.redirect(getUrl(ctx, callbackURL));
        }
        try {
          const fetchedRzpSub = await client.subscriptions.fetch(
            dbSubscription.razorpaySubscriptionId
          );
          if (fetchedRzpSub) {
            const plan = await getPlanByRazorpayId(
              options,
              fetchedRzpSub.plan_id
            );
            if (plan) {
              const isTrialing = !!fetchedRzpSub.start_at && // Changed to start_at
              fetchedRzpSub.start_at * 1e3 < Date.now() && // Changed to start_at
              !!fetchedRzpSub.end_at && // Changed to end_at
              fetchedRzpSub.end_at * 1e3 > Date.now();
              const statusToUpdate = isTrialing ? "trialing" : fetchedRzpSub.status;
              await ctx.context.adapter.update({
                model: "subscription",
                update: {
                  status: statusToUpdate,
                  periodStart: new Date(fetchedRzpSub.current_start * 1e3),
                  // Added non-null assertion
                  periodEnd: fetchedRzpSub.current_end ? new Date(fetchedRzpSub.current_end * 1e3) : void 0,
                  trialStart: fetchedRzpSub.start_at ? new Date(fetchedRzpSub.start_at * 1e3) : void 0,
                  trialEnd: fetchedRzpSub.end_at ? new Date(fetchedRzpSub.end_at * 1e3) : void 0,
                  updatedAt: /* @__PURE__ */ new Date()
                },
                where: [{ field: "id", value: dbSubscription.id }]
              });
              betterAuth.logger.info(
                `Razorpay success callback: Updated local subscription ${dbSubscription.id} to status ${statusToUpdate}.`
              );
            } else {
              betterAuth.logger.warn(
                `Razorpay success callback: Plan not found in config for Razorpay plan_id ${fetchedRzpSub.plan_id}`
              );
            }
          }
        } catch (error) {
          betterAuth.logger.error(
            `Error in Razorpay subscriptionSuccess for localSubId ${localSubscriptionId}: ${error.message}`
          );
        }
        return ctx.redirect(getUrl(ctx, callbackURL));
      }
    )
  };
  return {
    id: "razorpay",
    // Unique identifier for the plugin
    endpoints: {
      razorpayWebhook: plugins.createAuthEndpoint(
        "/razorpay/webhook",
        {
          method: "POST",
          metadata: { isAction: false },
          // Not a direct user action endpoint
          cloneRequest: true
          // Ensure raw body is available for signature verification
        },
        async (ctx) => {
          if (!ctx.request) {
            betterAuth.logger.error("Razorpay webhook: Request object is undefined.");
            throw new api.APIError("INTERNAL_SERVER_ERROR", {
              message: "Webhook request is malformed."
            });
          }
          const signature = ctx.request.headers.get(
            "x-razorpay-signature"
          );
          const webhookSecret = options.razorpayWebhookSecret;
          const body = await ctx.request.text();
          if (!signature || !webhookSecret) {
            betterAuth.logger.error(
              "Razorpay webhook: Secret or signature missing. Cannot process webhook."
            );
            throw new api.APIError("BAD_REQUEST", {
              message: "Webhook secret or signature not found."
            });
          }
          const isValid = razorpayUtils.validateWebhookSignature(
            // Used imported function
            body,
            // Use the raw text body
            signature,
            webhookSecret
          );
          if (!isValid) {
            betterAuth.logger.warn(
              "Razorpay webhook: Invalid signature received. Request denied."
            );
            throw new api.APIError("UNAUTHORIZED", {
              message: "Invalid webhook signature."
            });
          }
          const event = JSON.parse(body);
          try {
            switch (event.event) {
              case "subscription.activated":
                await onSubscriptionActivated(ctx, options, event);
                break;
              case "subscription.updated":
              case "subscription.halted":
              case "subscription.resumed":
              case "subscription.expired":
                await onSubscriptionUpdated(ctx, options, event);
                break;
              case "subscription.cancelled":
                await onSubscriptionCancelled(ctx, options, event);
                break;
              default:
                betterAuth.logger.info(
                  `Received unhandled Razorpay event: ${event.event}`
                );
            }
            await options.onEvent?.(event);
          } catch (e) {
            betterAuth.logger.error(
              `Razorpay webhook failed during event processing for event '${event.event}'. Error: ${e.message}`
            );
          }
          return ctx.json({ success: true });
        }
      ),
      // Conditionally include subscription management endpoints
      ...options.subscription?.enabled ? subscriptionEndpoints : {}
    },
    init(ctx) {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                async after(user, hookCtx) {
                  if (hookCtx && options.createCustomerOnSignUp) {
                    try {
                      const customerParams = await options.getCustomerCreateParams?.(
                        {
                          user
                        },
                        hookCtx.context.request
                      );
                      const rzpCustomer = await client.customers.create({
                        email: user.email,
                        name: user.name,
                        fail_existing: 0,
                        // Does not throw error if customer exists
                        ...customerParams?.params,
                        notes: {
                          userId: user.id,
                          ...customerParams?.params?.notes
                        }
                      });
                      const updatedUser = await hookCtx.context.adapter.update({
                        model: "user",
                        update: { razorpayCustomerId: rzpCustomer.id },
                        where: [{ field: "id", value: user.id }]
                      });
                      if (updatedUser) {
                        await options.onCustomerCreate?.({
                          user: updatedUser,
                          razorpayCustomer: rzpCustomer
                        });
                      } else {
                        betterAuth.logger.error(
                          `#BETTER_AUTH_RAZORPAY: Failed to update user ${user.id} with Razorpay Customer ID.`
                        );
                      }
                    } catch (error) {
                      betterAuth.logger.error(
                        `#BETTER_AUTH_RAZORPAY: Failed to create Razorpay customer for user ${user.id}. Error: ${error.message}`
                      );
                    }
                  }
                }
              }
            }
          }
        }
      };
    },
    schema: getSchema(options)
  };
};

exports.razorpay = razorpay;
