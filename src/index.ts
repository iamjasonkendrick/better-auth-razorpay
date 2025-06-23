import {
  type BetterAuthPlugin,
  type GenericEndpointContext,
  logger,
  type User, // Import User type
} from "better-auth";
import { APIError, originCheck, sessionMiddleware } from "better-auth/api";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/plugins";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils"; // Import webhook utility
import { z } from "zod";
// generateRandomString is not typically needed for Razorpay client-side flows as SDK handles idempotency.
// However, if needed for specific server-side idempotency keys for customer creation, it could be added.
// For now, assuming Razorpay's default behavior is sufficient.

import {
  onSubscriptionActivated,
  onSubscriptionCancelled,
  onSubscriptionUpdated,
} from "./hooks";
import { getSchema } from "./schema";
import type {
  InputSubscription,
  RazorpayOptions,
  RazorpayPlan,
  Subscription,
} from "./types";
import { getPlanByName, getPlanByRazorpayId, getPlans } from "./utils";

// SECTION 1: CONSTANTS AND HELPERS (Mirrors Stripe Plugin)
// =================================================================

const RAZORPAY_ERROR_CODES = {
  SUBSCRIPTION_NOT_FOUND: "Subscription not found",
  SUBSCRIPTION_PLAN_NOT_FOUND: "Subscription plan not found",
  ALREADY_SUBSCRIBED_PLAN: "You're already subscribed to this plan",
  UNABLE_TO_CREATE_CUSTOMER: "Unable to create customer",
  FAILED_TO_FETCH_PLANS: "Failed to fetch plans",
  EMAIL_VERIFICATION_REQUIRED:
    "Email verification is required before you can subscribe to a plan",
  SUBSCRIPTION_NOT_ACTIVE: "Subscription is not active",
  SUBSCRIPTION_NOT_CANCELLABLE: "Subscription cannot be cancelled",
  SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION:
    "Subscription is not scheduled for cancellation",
  // Add any other Razorpay specific error messages if needed
} as const;

const getUrl = (ctx: GenericEndpointContext, url: string): string => {
  if (url.startsWith("http")) {
    return url;
  }
  const baseURL = ctx.context.options.baseURL;
  if (!baseURL) {
    logger.error(
      "baseURL is not configured in better-auth options. Cannot construct URL."
    );
    return url.startsWith("/") ? url : `/${url}`;
  }
  return `${baseURL}${url.startsWith("/") ? url : `/${url}`}`;
};

// SECTION 2: MAIN PLUGIN FACTORY
// =================================================================

export const razorpay = <O extends RazorpayOptions>(options: O) => {
  const client = options.razorpayClient;

  // SECTION 3: AUTHORIZATION MIDDLEWARE (Mirrors Stripe Plugin)
  // =================================================================

  const referenceMiddleware = (
    action:
      | "create-subscription" // Covers Stripe's 'upgrade-subscription' concept
      | "list-subscription"
      | "cancel-subscription"
      | "restore-subscription"
  ) =>
    createAuthMiddleware(async (ctx) => {
      const session = ctx.context.session;
      if (!session) throw new APIError("UNAUTHORIZED");

      const referenceId =
        ctx.body?.referenceId || ctx.query?.referenceId || session.user.id;

      if (ctx.body?.referenceId && !options.subscription?.authorizeReference) {
        logger.error(
          `Passing 'referenceId' is not allowed if 'subscription.authorizeReference' is not defined.`
        );
        throw new APIError("BAD_REQUEST", {
          message: "Reference ID is not allowed. See server logs.",
        });
      }

      const isAuthorized =
        ctx.body?.referenceId || ctx.query?.referenceId
          ? await options.subscription?.authorizeReference?.({
              user: session.user,
              session: session.session,
              referenceId,
              action,
            })
          : true;

      if (!isAuthorized) throw new APIError("UNAUTHORIZED");
    });

  // SECTION 4: SUBSCRIPTION API ENDPOINTS (Mirrors Stripe Plugin Functionality)
  // =================================================================

  const subscriptionEndpoints = {
    /**
     * Creates a new subscription or updates an existing one (upgrade/downgrade).
     * This is the Razorpay equivalent of Stripe's `upgradeSubscription` endpoint.
     */
    createOrUpdateSubscription: createAuthEndpoint(
      "/subscription/create-or-update",
      {
        method: "POST",
        body: z.object({
          plan: z.string(),
          annual: z.boolean().optional(),
          referenceId: z.string().optional(),
          subscriptionId: z.string().optional(), // Local DB ID of the subscription to update
          seats: z.number().optional().default(1),
          successUrl: z.string().default("/"), // For new subscriptions redirecting to Razorpay checkout
          // cancelUrl: z.string().default("/"), // Razorpay checkout uses its own cancel, less relevant here
          // returnUrl: z.string().optional(), // More for Stripe's Billing Portal; Razorpay uses callback_url
          disableRedirect: z.boolean().default(false), // For new subscriptions
        }),
        // originCheck is less directly applicable here as Razorpay's checkout is a full redirect.
        // Security is handled by webhook verification and session state.
        use: [sessionMiddleware, referenceMiddleware("create-subscription")],
      },
      async (ctx) => {
        const { user, session } = ctx.context.session;
        if (
          !user.emailVerified &&
          options.subscription?.requireEmailVerification
        ) {
          throw new APIError("BAD_REQUEST", {
            message: RAZORPAY_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED,
          });
        }

        const referenceId = ctx.body.referenceId || user.id;
        const plan = await getPlanByName(options, ctx.body.plan);
        if (!plan)
          throw new APIError("NOT_FOUND", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_PLAN_NOT_FOUND,
          });

        const planIdToUse = ctx.body.annual
          ? plan.annualPlanId
          : plan.monthlyPlanId;
        if (!planIdToUse) {
          const billingCycle = ctx.body.annual ? "annual" : "monthly";
          throw new APIError("BAD_REQUEST", {
            message: `The ${billingCycle} pricing for plan '${plan.name}' is not configured.`,
          });
        }

        const subscriptions = await ctx.context.adapter.findMany<Subscription>({
          model: "subscription",
          where: [{ field: "referenceId", value: referenceId }],
        });
        const existingSubscription = ctx.body.subscriptionId
          ? subscriptions.find((sub) => sub.id === ctx.body.subscriptionId)
          : subscriptions.find(
              (sub) =>
                (sub.status === "active" || sub.status === "trialing") &&
                sub.groupId === plan.group
            );

        // --- UPGRADE/DOWNGRADE FLOW (Equivalent to Stripe's activeSubscription update) ---
        if (existingSubscription?.razorpaySubscriptionId) {
          if (
            existingSubscription.plan === plan.name.toLowerCase() &&
            existingSubscription.seats === ctx.body.seats
          ) {
            throw new APIError("BAD_REQUEST", {
              message: RAZORPAY_ERROR_CODES.ALREADY_SUBSCRIBED_PLAN,
            });
          }
          // Use Razorpay's upgrade API.
          const updatedRzpSub = await client.subscriptions.update(
            // Changed 'upgrade' to 'update'
            existingSubscription.razorpaySubscriptionId,
            {
              plan_id: planIdToUse,
              quantity: ctx.body.seats,
              schedule_change_at: "now", // Apply changes immediately
            }
          );
          await ctx.context.adapter.update<InputSubscription>({
            model: "subscription",
            where: [{ field: "id", value: existingSubscription.id }],
            update: {
              plan: plan.name.toLowerCase(),
              seats: ctx.body.seats,
              updatedAt: new Date(),
            },
          });
          // Upgrades are server-to-server; no redirect needed typically.
          return ctx.json({ ...updatedRzpSub, redirect: false });
        }

        // --- NEW SUBSCRIPTION FLOW (Equivalent to Stripe's Checkout Session creation) ---
        let customerId = user.razorpayCustomerId;
        if (!customerId) {
          try {
            // Idempotency for customer creation: Razorpay's `fail_existing: 0` handles this.
            const rzpCustomer = await client.customers.create({
              email: user.email,
              name: user.name || undefined,
              fail_existing: 0,
            });
            await ctx.context.adapter.update({
              model: "user",
              update: { razorpayCustomerId: rzpCustomer.id },
              where: [{ field: "id", value: user.id }],
            });
            customerId = rzpCustomer.id;
          } catch (e: any) {
            logger.error(
              `Razorpay: Failed to create customer for ${user.email}: ${e.message}`
            );
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: RAZORPAY_ERROR_CODES.UNABLE_TO_CREATE_CUSTOMER,
            });
          }
        }

        const userHookParams =
          await options.subscription?.getSubscriptionCreateParams?.({
            user,
            session,
            plan,
            subscription: undefined,
          }); // Pass undefined for new subscription
        const trialParams = plan.freeTrial
          ? {
              start_at: Math.floor(
                Date.now() / 1000 + plan.freeTrial.days * 24 * 60 * 60
              ),
            }
          : {};

        // Build base subscription payload
        const rzpSubscriptionPayload: any = {
          plan_id: planIdToUse,
          customer_id: customerId,
          total_count: 120, // For long-running subscriptions
          quantity: ctx.body.seats,
          ...trialParams,
          ...(userHookParams?.params || {}),
        };

        // Merge notes separately to ensure referenceId and userId are preserved
        rzpSubscriptionPayload.notes = {
          referenceId,
          userId: user.id,
          ...(userHookParams?.params?.notes || {}),
        };

        const rzpSub = await client.subscriptions.create(
          rzpSubscriptionPayload
        );
        const newDbSub = await ctx.context.adapter.create<
          InputSubscription,
          Subscription
        >({
          model: "subscription",
          data: {
            plan: plan.name.toLowerCase(),
            razorpayCustomerId: customerId,
            razorpaySubscriptionId: rzpSub.id,
            status: "created",
            referenceId,
            seats: ctx.body.seats,
            groupId: plan.group,
          },
        });

        if (!newDbSub) {
          try {
            await client.subscriptions.cancel(rzpSub.id, true);
          } catch (cancelError: any) {
            logger.error(
              `CRITICAL: Failed to cancel orphaned Razorpay subscription ${rzpSub.id}: ${cancelError.message}`
            );
          }
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "Failed to create local subscription record.",
          });
        }

        // This callback URL is what Razorpay checkout will redirect to upon completion.
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
          redirect: !ctx.body.disableRedirect,
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
    cancelSubscriptionCallback: createAuthEndpoint(
      "/subscription/cancel/callback", // Path kept for structural parity
      {
        method: "GET", // Assuming a GET redirect if this flow exists
        query: z.record(z.string(), z.any()).optional(),
        // originCheck might be relevant if it's a redirect from a trusted Razorpay domain
        use: [originCheck((c) => [c.query?.callbackURL as string])],
      },
      async (ctx) => {
        // This logic would be highly dependent on what Razorpay sends back in such a redirect.
        // For now, it primarily handles redirecting back to the app.
        // Actual cancellation status update should rely on webhooks.
        const {
          callbackURL,
          subscriptionId: localSubscriptionId /* other params? */,
        } = ctx.query ?? {};
        if (!callbackURL || !localSubscriptionId) {
          return ctx.redirect(getUrl(ctx, (callbackURL as string) || "/"));
        }

        // Optional: Fetch local subscription and check if a cancelAtPeriodEnd was expected.
        // However, the webhook for 'subscription.updated' or 'subscription.cancelled' is more reliable.
        logger.info(
          `cancelSubscriptionCallback invoked for localSubId ${localSubscriptionId}. Redirecting to ${callbackURL}.`
        );
        return ctx.redirect(getUrl(ctx, callbackURL as string));
      }
    ),

    /**
     * Cancels a subscription via API.
     */
    cancelSubscription: createAuthEndpoint(
      "/subscription/cancel",
      {
        method: "POST",
        body: z.object({
          subscriptionId: z.string(), // Local DB subscription ID
          referenceId: z.string().optional(), // For authorization
          immediately: z.boolean().default(false),
          // returnUrl: z.string(), // Less relevant for API-only cancel, Stripe uses for billing portal
        }),
        use: [sessionMiddleware, referenceMiddleware("cancel-subscription")],
      },
      async (ctx) => {
        const { subscriptionId, immediately } = ctx.body;
        const subscription = await ctx.context.adapter.findOne<Subscription>({
          model: "subscription",
          where: [{ field: "id", value: subscriptionId }],
        });
        if (!subscription || !subscription.razorpaySubscriptionId)
          throw new APIError("NOT_FOUND", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
          });
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        ) {
          throw new APIError("BAD_REQUEST", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_CANCELLABLE,
          });
        }

        const cancelledRzpSub = await client.subscriptions.cancel(
          subscription.razorpaySubscriptionId,
          !immediately
        );
        await ctx.context.adapter.update<InputSubscription>({
          model: "subscription",
          update: {
            cancelAtPeriodEnd: !immediately,
            status: immediately ? "cancelled" : subscription.status,
            updatedAt: new Date(),
          },
          where: [{ field: "id", value: subscription.id }],
        });
        return ctx.json(cancelledRzpSub);
      }
    ),

    /**
     * Restores a subscription that was scheduled for cancellation at period end.
     */
    restoreSubscription: createAuthEndpoint(
      "/subscription/restore",
      {
        method: "POST",
        body: z.object({
          subscriptionId: z.string(), // Local DB subscription ID
          referenceId: z.string().optional(), // For authorization
        }),
        use: [sessionMiddleware, referenceMiddleware("restore-subscription")],
      },
      async (ctx) => {
        const { subscriptionId } = ctx.body;
        const subscription = await ctx.context.adapter.findOne<Subscription>({
          model: "subscription",
          where: [{ field: "id", value: subscriptionId }],
        });
        if (!subscription || !subscription.razorpaySubscriptionId)
          throw new APIError("NOT_FOUND", {
            message: RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
          });
        if (!subscription.cancelAtPeriodEnd) {
          // Can only restore if scheduled for cancellation
          throw new APIError("BAD_REQUEST", {
            message:
              RAZORPAY_ERROR_CODES.SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION,
          });
        }

        const restoredRzpSub =
          await client.subscriptions.cancelScheduledChanges(
            subscription.razorpaySubscriptionId
          );
        await ctx.context.adapter.update<InputSubscription>({
          model: "subscription",
          update: { cancelAtPeriodEnd: false, updatedAt: new Date() },
          where: [{ field: "id", value: subscription.id }],
        });
        return ctx.json(restoredRzpSub);
      }
    ),

    /**
     * Lists active and trialing subscriptions for the referenceId.
     */
    listActiveSubscriptions: createAuthEndpoint(
      "/subscription/list",
      {
        method: "GET",
        query: z.optional(z.object({ referenceId: z.string().optional() })),
        use: [sessionMiddleware, referenceMiddleware("list-subscription")],
      },
      async (ctx) => {
        const referenceId =
          ctx.query?.referenceId || ctx.context.session.user.id;
        const allSubscriptions =
          await ctx.context.adapter.findMany<Subscription>({
            model: "subscription",
            where: [{ field: "referenceId", value: referenceId }],
          });
        if (!allSubscriptions.length) return ctx.json([]);
        const plans = await getPlans(options);
        const activeSubs = allSubscriptions
          .map((sub: Subscription) => {
            const plan = plans.find(
              (p) =>
                p.name.toLowerCase() === sub.plan.toLowerCase() &&
                p.group === sub.groupId
            );
            return { ...sub, limits: plan?.limits };
          })
          .filter(
            (sub) => sub.status === "active" || sub.status === "trialing"
          );
        return ctx.json(activeSubs);
      }
    ),

    /**
     * Callback endpoint after successful Razorpay checkout. Updates local DB for immediate UX.
     */
    subscriptionSuccess: createAuthEndpoint(
      "/subscription/success",
      {
        method: "GET",
        query: z.record(z.string(), z.any()).optional(),
        use: [originCheck((c) => [c.query?.callbackURL as string])], // Check origin of the callback redirect
      },
      async (ctx) => {
        const {
          callbackURL,
          subscriptionId: localSubscriptionId,
          rzp_sub_id: rzpSubscriptionIdFromQuery,
        } = ctx.query ?? {};

        if (!callbackURL || !localSubscriptionId) {
          logger.warn(
            "Razorpay success callback: Missing callbackURL or localSubscriptionId."
          );
          return ctx.redirect(getUrl(ctx, (callbackURL as string) || "/"));
        }

        const dbSubscription = await ctx.context.adapter.findOne<Subscription>({
          model: "subscription",
          where: [{ field: "id", value: localSubscriptionId as string }],
        });

        if (!dbSubscription || !dbSubscription.razorpaySubscriptionId) {
          logger.warn(
            `Razorpay success callback: DB subscription not found for local ID ${localSubscriptionId} or missing Razorpay ID.`
          );
          return ctx.redirect(getUrl(ctx, callbackURL as string));
        }
        if (
          dbSubscription.status === "active" ||
          dbSubscription.status === "trialing"
        ) {
          logger.info(
            `Razorpay success callback: DB subscription ${localSubscriptionId} already active/trialing.`
          );
          return ctx.redirect(getUrl(ctx, callbackURL as string));
        }

        // Verify that the razorpay_subscription_id from query (if present) matches the one stored
        if (
          rzpSubscriptionIdFromQuery &&
          dbSubscription.razorpaySubscriptionId !== rzpSubscriptionIdFromQuery
        ) {
          logger.error(
            `CRITICAL: Razorpay subscription ID mismatch in success callback. DB: ${dbSubscription.razorpaySubscriptionId}, Query: ${rzpSubscriptionIdFromQuery}. Investigate immediately.`
          );
          // Potentially throw an error or handle this security concern
          return ctx.redirect(getUrl(ctx, callbackURL as string)); // Or an error page
        }

        try {
          const fetchedRzpSub = await client.subscriptions.fetch(
            dbSubscription.razorpaySubscriptionId
          );
          if (fetchedRzpSub) {
            const plan = await getPlanByRazorpayId(
              options,
              fetchedRzpSub.plan_id
            ); // Use the plan_id from fetched Razorpay sub
            if (plan) {
              const isTrialing =
                !!fetchedRzpSub.start_at && // Changed to start_at
                fetchedRzpSub.start_at * 1000 < Date.now() && // Changed to start_at
                !!fetchedRzpSub.end_at && // Changed to end_at
                fetchedRzpSub.end_at * 1000 > Date.now(); // Changed to end_at
              const statusToUpdate = isTrialing
                ? "trialing"
                : fetchedRzpSub.status;

              await ctx.context.adapter.update<InputSubscription>({
                model: "subscription",
                update: {
                  status: statusToUpdate,
                  periodStart: new Date(fetchedRzpSub.current_start! * 1000), // Added non-null assertion
                  periodEnd: fetchedRzpSub.current_end
                    ? new Date(fetchedRzpSub.current_end * 1000)
                    : undefined,
                  trialStart: fetchedRzpSub.start_at // Changed to start_at
                    ? new Date(fetchedRzpSub.start_at * 1000) // Changed to start_at
                    : undefined,
                  trialEnd: fetchedRzpSub.end_at // Changed to end_at
                    ? new Date(fetchedRzpSub.end_at * 1000) // Changed to end_at
                    : undefined,
                  updatedAt: new Date(),
                },
                where: [{ field: "id", value: dbSubscription.id }],
              });
              logger.info(
                `Razorpay success callback: Updated local subscription ${dbSubscription.id} to status ${statusToUpdate}.`
              );
            } else {
              logger.warn(
                `Razorpay success callback: Plan not found in config for Razorpay plan_id ${fetchedRzpSub.plan_id}`
              );
            }
          }
        } catch (error: any) {
          logger.error(
            `Error in Razorpay subscriptionSuccess for localSubId ${localSubscriptionId}: ${error.message}`
          );
        }
        return ctx.redirect(getUrl(ctx, callbackURL as string));
      }
    ),
  };

  // SECTION 5: FINAL PLUGIN ASSEMBLY
  // =================================================================

  return {
    id: "razorpay", // Unique identifier for the plugin
    endpoints: {
      razorpayWebhook: createAuthEndpoint(
        "/razorpay/webhook",
        {
          method: "POST",
          metadata: { isAction: false }, // Not a direct user action endpoint
          cloneRequest: true, // Ensure raw body is available for signature verification
        },
        async (ctx) => {
          // Ensure ctx.request is not undefined before accessing headers or text()
          if (!ctx.request) {
            logger.error("Razorpay webhook: Request object is undefined.");
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Webhook request is malformed.",
            });
          }

          const signature = ctx.request.headers.get(
            "x-razorpay-signature"
          ) as string;
          const webhookSecret = options.razorpayWebhookSecret;
          // IMPORTANT: Razorpay requires the raw request body for signature verification.
          const body = await ctx.request.text();

          if (!signature || !webhookSecret) {
            logger.error(
              "Razorpay webhook: Secret or signature missing. Cannot process webhook."
            );
            throw new APIError("BAD_REQUEST", {
              message: "Webhook secret or signature not found.",
            });
          }

          // Use the imported Razorpay object for utility functions
          const isValid = validateWebhookSignature(
            // Used imported function
            body, // Use the raw text body
            signature,
            webhookSecret
          );

          if (!isValid) {
            logger.warn(
              "Razorpay webhook: Invalid signature received. Request denied."
            );
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid webhook signature.",
            });
          }

          const event = JSON.parse(body); // Now parse the verified body

          try {
            switch (event.event) {
              case "subscription.activated":
                await onSubscriptionActivated(ctx, options, event);
                break;
              case "subscription.updated":
              case "subscription.halted":
              case "subscription.resumed":
              case "subscription.expired":
                // Handle all status update events with the same handler
                await onSubscriptionUpdated(ctx, options, event);
                break;
              case "subscription.cancelled":
                await onSubscriptionCancelled(ctx, options, event);
                break;
              default:
                // Log unhandled events but still process through onEvent
                logger.info(
                  `Received unhandled Razorpay event: ${event.event}`
                );
            }
            // Call the global onEvent handler if provided
            await options.onEvent?.(event);
          } catch (e: any) {
            logger.error(
              `Razorpay webhook failed during event processing for event '${event.event}'. Error: ${e.message}`
            );
            // It's crucial to still return a 200 OK to Razorpay to prevent retries
            // for errors on our side. The error is logged for debugging.
          }

          return ctx.json({ success: true }); // Acknowledge receipt to Razorpay
        }
      ),
      // Conditionally include subscription management endpoints
      ...((options.subscription?.enabled
        ? subscriptionEndpoints
        : {}) as O["subscription"] extends { enabled: true }
        ? typeof subscriptionEndpoints
        : {}),
    },
    init(ctx) {
      // ctx here is BetterAuthContext
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                async after(user, hookCtx) {
                  // hookCtx is BetterAuthHookContext
                  if (hookCtx && options.createCustomerOnSignUp) {
                    try {
                      // Get custom parameters for customer creation
                      const customerParams =
                        await options.getCustomerCreateParams?.(
                          {
                            user,
                          },
                          hookCtx.context.request
                        );

                      const rzpCustomer = await client.customers.create({
                        email: user.email,
                        name: user.name,
                        fail_existing: 0, // Does not throw error if customer exists
                        ...customerParams?.params,
                        notes: {
                          userId: user.id,
                          ...customerParams?.params?.notes,
                        },
                      });
                      const updatedUser = await hookCtx.context.adapter.update({
                        model: "user",
                        update: { razorpayCustomerId: rzpCustomer.id },
                        where: [{ field: "id", value: user.id }],
                      });
                      if (updatedUser) {
                        await options.onCustomerCreate?.({
                          user: updatedUser as User,
                          razorpayCustomer: rzpCustomer,
                        });
                      } else {
                        logger.error(
                          `#BETTER_AUTH_RAZORPAY: Failed to update user ${user.id} with Razorpay Customer ID.`
                        );
                      }
                    } catch (error: any) {
                      logger.error(
                        `#BETTER_AUTH_RAZORPAY: Failed to create Razorpay customer for user ${user.id}. Error: ${error.message}`
                      );
                    }
                  }
                },
              },
            },
          },
        },
      };
    },
    schema: getSchema(options),
  } satisfies BetterAuthPlugin;
};

export type { RazorpayPlan, Subscription };
