import type { GenericEndpointContext } from "@better-auth/core";
import type { User } from "@better-auth/core/db";
import type { Organization } from "better-auth/plugins/organization";
import { subscriptionNotes } from "./metadata";
import type {
  CustomerType,
  RazorpayOptions,
  RazorpayWebhookEvent,
  Subscription,
} from "./types";
import {
  getPlanByPlanId,
  timestampToDate,
  toSubscriptionStatus,
} from "./utils";

/**
 * Find organization or user by razorpayCustomerId.
 * @internal
 */
async function findReferenceByRazorpayCustomerId(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  razorpayCustomerId: string,
): Promise<{ customerType: CustomerType; referenceId: string } | null> {
  if (options.organization?.enabled) {
    const org = await ctx.context.adapter.findOne<Organization>({
      model: "organization",
      where: [{ field: "razorpayCustomerId", value: razorpayCustomerId }],
    });
    if (org) return { customerType: "organization", referenceId: org.id };
  }

  const user = await ctx.context.adapter.findOne<User>({
    model: "user",
    where: [{ field: "razorpayCustomerId", value: razorpayCustomerId }],
  });
  if (user) return { customerType: "user", referenceId: user.id };

  return null;
}

/**
 * Find or create subscription record for a Razorpay subscription entity
 * @internal
 */
async function findSubscriptionByRazorpayId(
  ctx: GenericEndpointContext,
  razorpaySubscriptionId: string,
): Promise<Subscription | null> {
  return await ctx.context.adapter.findOne<Subscription>({
    model: "subscription",
    where: [
      {
        field: "razorpaySubscriptionId",
        value: razorpaySubscriptionId,
      },
    ],
  });
}

/**
 * subscription.authenticated
 *
 * The subscription has been authorized and the customer has completed authentication.
 */
export async function onSubscriptionAuthenticated(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    let subscription = await findSubscriptionByRazorpayId(ctx, razorpaySub.id);

    if (subscription) {
      subscription = await ctx.context.adapter.update<Subscription>({
        model: "subscription",
        update: {
          status: "authenticated",
          updatedAt: new Date(),
        },
        where: [{ field: "id", value: subscription.id }],
      });
    } else {
      // Subscription created externally (API/Dashboard) — create DB record
      const customerId = razorpaySub.customer_id;
      let referenceId: string | undefined;
      if (customerId) {
        const ref = await findReferenceByRazorpayCustomerId(
          ctx,
          options,
          customerId,
        );
        referenceId = ref?.referenceId;
      }
      const notes = subscriptionNotes.get(razorpaySub.notes);
      referenceId = referenceId || notes.referenceId;

      if (!referenceId) {
        ctx.context.logger.warn(
          `Razorpay webhook: subscription.authenticated — no reference found for subscription ${razorpaySub.id}`,
        );
        return;
      }

      const plan = await getPlanByPlanId(options, razorpaySub.plan_id);
      subscription = (await ctx.context.adapter.create({
        model: "subscription",
        data: {
          plan: plan?.name.toLowerCase() || razorpaySub.plan_id,
          referenceId,
          razorpayCustomerId: customerId,
          razorpaySubscriptionId: razorpaySub.id,
          razorpayPlanId: razorpaySub.plan_id,
          status: "authenticated",
          quantity: razorpaySub.quantity,
          totalCount: razorpaySub.total_count,
          paidCount: razorpaySub.paid_count,
          remainingCount: razorpaySub.remaining_count,
          shortUrl: razorpaySub.short_url ?? undefined,
        },
      })) as Subscription;
    }

    await options.subscription.onSubscriptionAuthenticated?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: subscription as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.authenticated) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.activated
 *
 * The subscription is active and the first payment has been successful.
 */
export async function onSubscriptionActivated(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const plan = await getPlanByPlanId(options, razorpaySub.plan_id);
    let subscription = await findSubscriptionByRazorpayId(ctx, razorpaySub.id);

    const updateData = {
      status: "active" as const,
      razorpayPlanId: razorpaySub.plan_id,
      razorpayCustomerId: razorpaySub.customer_id,
      currentStart: timestampToDate(razorpaySub.current_start),
      currentEnd: timestampToDate(razorpaySub.current_end),
      quantity: razorpaySub.quantity,
      totalCount: razorpaySub.total_count,
      paidCount: razorpaySub.paid_count,
      remainingCount: razorpaySub.remaining_count,
      shortUrl: razorpaySub.short_url,
      updatedAt: new Date(),
    };

    if (subscription) {
      subscription = await ctx.context.adapter.update<Subscription>({
        model: "subscription",
        update: {
          ...updateData,
          ...(plan ? { plan: plan.name.toLowerCase() } : {}),
        },
        where: [{ field: "id", value: subscription.id }],
      });
    } else {
      // Created externally
      const customerId = razorpaySub.customer_id;
      let referenceId: string | undefined;
      if (customerId) {
        const ref = await findReferenceByRazorpayCustomerId(
          ctx,
          options,
          customerId,
        );
        referenceId = ref?.referenceId;
      }
      const notes = subscriptionNotes.get(razorpaySub.notes);
      referenceId = referenceId || notes.referenceId;

      if (!referenceId) {
        ctx.context.logger.warn(
          `Razorpay webhook: subscription.activated — no reference found for subscription ${razorpaySub.id}`,
        );
        return;
      }

      subscription = (await ctx.context.adapter.create({
        model: "subscription",
        data: {
          ...updateData,
          plan: plan?.name.toLowerCase() || razorpaySub.plan_id,
          referenceId,
          razorpaySubscriptionId: razorpaySub.id,
        },
      })) as Subscription;
    }

    if (plan) {
      await options.subscription.onSubscriptionActivated?.({
        event,
        razorpaySubscription: razorpaySub,
        subscription: subscription as Subscription,
        plan,
      });
    }
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.activated) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.charged
 *
 * A recurring payment has been successfully charged.
 */
export async function onSubscriptionCharged(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const subscription = await findSubscriptionByRazorpayId(
      ctx,
      razorpaySub.id,
    );
    if (!subscription) {
      ctx.context.logger.warn(
        `Razorpay webhook: subscription.charged — subscription ${razorpaySub.id} not found`,
      );
      return;
    }

    const updatedSubscription = await ctx.context.adapter.update<Subscription>({
      model: "subscription",
      update: {
        status: toSubscriptionStatus(razorpaySub.status),
        currentStart: timestampToDate(razorpaySub.current_start),
        currentEnd: timestampToDate(razorpaySub.current_end),
        paidCount: razorpaySub.paid_count,
        remainingCount: razorpaySub.remaining_count,
        updatedAt: new Date(),
      },
      where: [{ field: "id", value: subscription.id }],
    });

    await options.subscription.onSubscriptionCharged?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: (updatedSubscription || subscription) as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.charged) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.pending
 *
 * Payment is pending (retry in progress).
 */
export async function onSubscriptionPending(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const subscription = await findSubscriptionByRazorpayId(
      ctx,
      razorpaySub.id,
    );
    if (!subscription) {
      ctx.context.logger.warn(
        `Razorpay webhook: subscription.pending — subscription ${razorpaySub.id} not found`,
      );
      return;
    }

    const updatedSubscription = await ctx.context.adapter.update<Subscription>({
      model: "subscription",
      update: {
        status: "pending",
        updatedAt: new Date(),
      },
      where: [{ field: "id", value: subscription.id }],
    });

    await options.subscription.onSubscriptionPending?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: (updatedSubscription || subscription) as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.pending) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.halted
 *
 * Payment retries exhausted. Subscription is halted.
 */
export async function onSubscriptionHalted(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const subscription = await findSubscriptionByRazorpayId(
      ctx,
      razorpaySub.id,
    );
    if (!subscription) {
      ctx.context.logger.warn(
        `Razorpay webhook: subscription.halted — subscription ${razorpaySub.id} not found`,
      );
      return;
    }

    const updatedSubscription = await ctx.context.adapter.update<Subscription>({
      model: "subscription",
      update: {
        status: "halted",
        updatedAt: new Date(),
      },
      where: [{ field: "id", value: subscription.id }],
    });

    await options.subscription.onSubscriptionHalted?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: (updatedSubscription || subscription) as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.halted) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.completed
 *
 * All billing cycles are complete.
 */
export async function onSubscriptionCompleted(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const subscription = await findSubscriptionByRazorpayId(
      ctx,
      razorpaySub.id,
    );
    if (!subscription) {
      ctx.context.logger.warn(
        `Razorpay webhook: subscription.completed — subscription ${razorpaySub.id} not found`,
      );
      return;
    }

    const updatedSubscription = await ctx.context.adapter.update<Subscription>({
      model: "subscription",
      update: {
        status: "completed",
        endedAt: timestampToDate(razorpaySub.ended_at) || new Date(),
        paidCount: razorpaySub.paid_count,
        remainingCount: 0,
        updatedAt: new Date(),
      },
      where: [{ field: "id", value: subscription.id }],
    });

    await options.subscription.onSubscriptionCompleted?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: (updatedSubscription || subscription) as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.completed) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.updated
 *
 * Subscription was updated (plan change, quantity change, etc).
 */
export async function onSubscriptionUpdated(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const subscription = await findSubscriptionByRazorpayId(
      ctx,
      razorpaySub.id,
    );
    if (!subscription) {
      ctx.context.logger.warn(
        `Razorpay webhook: subscription.updated — subscription ${razorpaySub.id} not found`,
      );
      return;
    }

    const plan = await getPlanByPlanId(options, razorpaySub.plan_id);

    const updatedSubscription = await ctx.context.adapter.update<Subscription>({
      model: "subscription",
      update: {
        ...(plan ? { plan: plan.name.toLowerCase() } : {}),
        status: toSubscriptionStatus(razorpaySub.status),
        razorpayPlanId: razorpaySub.plan_id,
        currentStart: timestampToDate(razorpaySub.current_start),
        currentEnd: timestampToDate(razorpaySub.current_end),
        quantity: razorpaySub.quantity,
        totalCount: razorpaySub.total_count,
        paidCount: razorpaySub.paid_count,
        remainingCount: razorpaySub.remaining_count,
        updatedAt: new Date(),
      },
      where: [{ field: "id", value: subscription.id }],
    });

    await options.subscription.onSubscriptionUpdated?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: (updatedSubscription || subscription) as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.updated) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.paused
 *
 * The subscription has been paused.
 */
export async function onSubscriptionPaused(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const subscription = await findSubscriptionByRazorpayId(
      ctx,
      razorpaySub.id,
    );
    if (!subscription) {
      ctx.context.logger.warn(
        `Razorpay webhook: subscription.paused — subscription ${razorpaySub.id} not found`,
      );
      return;
    }

    const updatedSubscription = await ctx.context.adapter.update<Subscription>({
      model: "subscription",
      update: {
        status: "paused",
        pausedAt: timestampToDate(razorpaySub.paused_at) || new Date(),
        updatedAt: new Date(),
      },
      where: [{ field: "id", value: subscription.id }],
    });

    await options.subscription.onSubscriptionPaused?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: (updatedSubscription || subscription) as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.paused) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.resumed
 *
 * The subscription has been resumed from paused state.
 */
export async function onSubscriptionResumed(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const subscription = await findSubscriptionByRazorpayId(
      ctx,
      razorpaySub.id,
    );
    if (!subscription) {
      ctx.context.logger.warn(
        `Razorpay webhook: subscription.resumed — subscription ${razorpaySub.id} not found`,
      );
      return;
    }

    const updatedSubscription = await ctx.context.adapter.update<Subscription>({
      model: "subscription",
      update: {
        status: toSubscriptionStatus(razorpaySub.status),
        pausedAt: null,
        currentStart: timestampToDate(razorpaySub.current_start),
        currentEnd: timestampToDate(razorpaySub.current_end),
        updatedAt: new Date(),
      },
      where: [{ field: "id", value: subscription.id }],
    });

    await options.subscription.onSubscriptionResumed?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: (updatedSubscription || subscription) as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.resumed) failed: ${error.message}`,
    );
  }
}

/**
 * subscription.cancelled
 *
 * The subscription has been cancelled.
 */
export async function onSubscriptionCancelled(
  ctx: GenericEndpointContext,
  options: RazorpayOptions,
  event: RazorpayWebhookEvent,
) {
  try {
    if (!options.subscription?.enabled) return;

    const razorpaySub = event.payload.subscription?.entity;
    if (!razorpaySub) return;

    const subscription = await findSubscriptionByRazorpayId(
      ctx,
      razorpaySub.id,
    );
    if (!subscription) {
      ctx.context.logger.warn(
        `Razorpay webhook: subscription.cancelled — subscription ${razorpaySub.id} not found`,
      );
      return;
    }

    const updatedSubscription = await ctx.context.adapter.update<Subscription>({
      model: "subscription",
      update: {
        status: "cancelled",
        cancelledAt: new Date(),
        endedAt: timestampToDate(razorpaySub.ended_at) || new Date(),
        updatedAt: new Date(),
      },
      where: [{ field: "id", value: subscription.id }],
    });

    await options.subscription.onSubscriptionCancelled?.({
      event,
      razorpaySubscription: razorpaySub,
      subscription: (updatedSubscription || subscription) as Subscription,
    });
  } catch (error: any) {
    ctx.context.logger.error(
      `Razorpay webhook (subscription.cancelled) failed: ${error.message}`,
    );
  }
}
