import { type GenericEndpointContext, logger } from "better-auth";
import type { InputSubscription, RazorpayOptions, Subscription } from "./types";
import { extractRazorpayErrorMessage, getPlanByRazorpayId } from "./utils";

/**
 * Handles the 'subscription.activated' webhook from Razorpay.
 */
export async function onCheckoutSessionCompleted(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: any // Razorpay webhook event
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySubscription = event.payload.subscription.entity;
    const plan = await getPlanByRazorpayId(
      options,
      razorpaySubscription.plan_id
    );

    if (!plan) {
      logger.warn(
        `Razorpay webhook: Plan not found for Razorpay Plan ID: ${razorpaySubscription.plan_id}`
      );
      return;
    }

    // Find the local subscription using the Razorpay subscription ID
    let dbSubscription = await ctx.context.adapter.findOne<Subscription>({
      model: "subscription",
      where: [
        { field: "razorpaySubscriptionId", value: razorpaySubscription.id },
      ],
    });

    if (!dbSubscription) {
      logger.error(
        `Razorpay webhook: Could not find a matching DB subscription for Razorpay ID: ${razorpaySubscription.id}`
      );
      return;
    }

    const trial =
      razorpaySubscription.trial_start && razorpaySubscription.trial_end
        ? {
            trialStart: new Date(razorpaySubscription.trial_start * 1000),
            trialEnd: new Date(razorpaySubscription.trial_end * 1000),
          }
        : {};

    // Update the local subscription with details from the Razorpay webhook
    await ctx.context.adapter.update<InputSubscription>({
      model: "subscription",
      where: [{ field: "id", value: dbSubscription.id }],
      update: {
        status: razorpaySubscription.status,
        periodStart: razorpaySubscription.current_start
          ? new Date(razorpaySubscription.current_start * 1000)
          : undefined,
        periodEnd: razorpaySubscription.current_end
          ? new Date(razorpaySubscription.current_end * 1000)
          : undefined,
        ...trial,
        // Ensure plan name is updated if it changed during activation (e.g., trial to paid)
        plan: plan.name.toLowerCase(),
        seats: razorpaySubscription.quantity,
        razorpaySubscriptionId: razorpaySubscription.id,
      },
    });

    // Re-fetch the updated subscription to pass to hooks
    const updatedSubscription = await ctx.context.adapter.findOne<Subscription>(
      {
        model: "subscription",
        where: [{ field: "id", value: dbSubscription.id }],
      }
    );

    if (!updatedSubscription) {
      logger.error(
        `Razorpay webhook: Failed to find subscription after updating it: ${dbSubscription.id}`
      );
      return;
    }

    // Call onTrialStart hook if applicable
    if (trial.trialStart && plan.freeTrial?.onTrialStart) {
      await plan.freeTrial.onTrialStart(updatedSubscription); // Removed ctx
    }

    // Call onSubscriptionComplete hook (equivalent to Stripe's)
    await options.subscription?.onSubscriptionComplete?.({
      event,
      subscription: updatedSubscription,
      razorpaySubscription,
      plan,
    }); // Removed ctx
  } catch (e: any) {
    const errorMessage = extractRazorpayErrorMessage(e);
    logger.error(
      `Razorpay webhook 'checkout.session.completed' failed. Error: ${errorMessage}`
    );
  }
}

/**
 * Handles the 'subscription.updated' webhook.
 */
export async function onSubscriptionUpdated(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: any
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySubscription = event.payload.subscription.entity;
    const subscription = await ctx.context.adapter.findOne<Subscription>({
      model: "subscription",
      where: [
        { field: "razorpaySubscriptionId", value: razorpaySubscription.id },
      ],
    });

    if (!subscription) {
      logger.warn(
        `Razorpay webhook 'updated': Subscription not found for ID: ${razorpaySubscription.id}`
      );
      return;
    }

    const subscriptionNewlyCancelled =
      razorpaySubscription.cancel_at_cycle_end === true &&
      !subscription.cancelAtPeriodEnd;

    await ctx.context.adapter.update<InputSubscription>({
      model: "subscription",
      where: [{ field: "id", value: subscription.id }],
      update: {
        status: razorpaySubscription.status,
        cancelAtPeriodEnd: razorpaySubscription.cancel_at_cycle_end,
        updatedAt: new Date(),
      },
    });

    if (subscriptionNewlyCancelled) {
      await options.subscription.onSubscriptionCancel?.({
        event,
        razorpaySubscription,
        subscription,
      });
    }

    await options.subscription.onSubscriptionUpdate?.({
      event,
      subscription,
    });
  } catch (e: any) {
    const errorMessage = extractRazorpayErrorMessage(e);
    logger.error(
      `Razorpay webhook 'subscription.updated' failed. Error: ${errorMessage}`
    );
  }
}

/**
 * Handles the 'subscription.cancelled' webhook for immediate cancellations.
 */
export async function onSubscriptionCancelled(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: any
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySubscription = event.payload.subscription.entity;
    const subscription = await ctx.context.adapter.findOne<Subscription>({
      model: "subscription",
      where: [
        { field: "razorpaySubscriptionId", value: razorpaySubscription.id },
      ],
    });

    if (subscription) {
      await ctx.context.adapter.update({
        model: "subscription",
        where: [{ field: "id", value: subscription.id }],
        update: {
          status: "cancelled",
          updatedAt: new Date(),
          cancelAtPeriodEnd: false,
        },
      });

      await options.subscription?.onSubscriptionCancel?.({
        event,
        razorpaySubscription,
        subscription,
      });
    } else {
      // CORRECTED: Fixed the typo from 'razorpySubscription' to 'razorpaySubscription'
      logger.warn(
        `Razorpay webhook 'cancelled': Subscription not found for ID: ${razorpaySubscription.id}`
      );
    }
  } catch (e: any) {
    const errorMessage = extractRazorpayErrorMessage(e);
    logger.error(
      `Razorpay webhook 'subscription.cancelled' failed. Error: ${errorMessage}`
    );
  }
}
