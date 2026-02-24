import type { BetterAuthPlugin, User } from "better-auth";
import type { Organization } from "better-auth/plugins/organization";
import { APIError } from "better-call";
import { RAZORPAY_ERROR_CODES } from "./error-codes";
import { customerNotes } from "./metadata";
import {
  cancelPendingUpdate,
  cancelSubscription,
  createCustomer,
  createPlan,
  createSubscriptionLink,
  deleteOffer,
  editCustomer,
  fetchCustomer,
  fetchInvoices,
  fetchPendingUpdate,
  fetchPlan,
  fetchSubscription,
  linkOffer,
  listCustomers,
  listPlans,
  listSubscriptions,
  pauseSubscription,
  razorpayWebhook,
  resumeSubscription,
  updateSubscription,
  upgradeSubscription,
} from "./routes";
import { getSchema } from "./schema";
import type {
  RazorpayOptions,
  Subscription,
  WithRazorpayCustomerId,
} from "./types";
import { createAPIError, getPlans, isActive } from "./utils";

declare module "@better-auth/core" {
  interface BetterAuthPluginRegistry<AuthOptions, Options> {
    razorpay: {
      creator: typeof razorpay;
    };
  }
}

export const razorpay = <O extends RazorpayOptions>(options: O) => {
  const client = options.razorpayClient;

  const subscriptionEndpoints = {
    upgradeSubscription: upgradeSubscription(options),
    cancelSubscription: cancelSubscription(options),
    pauseSubscription: pauseSubscription(options),
    resumeSubscription: resumeSubscription(options),
    listSubscriptions: listSubscriptions(options),
    updateSubscription: updateSubscription(options),
  };

  const razorpaySpecificEndpoints = {
    fetchSubscription: fetchSubscription(options),
    createSubscriptionLink: createSubscriptionLink(options),
    fetchPendingUpdate: fetchPendingUpdate(options),
    cancelPendingUpdate: cancelPendingUpdate(options),
    fetchInvoices: fetchInvoices(options),
    linkOffer: linkOffer(options),
    deleteOffer: deleteOffer(options),
    createPlan: createPlan(options),
    listPlans: listPlans(options),
    fetchPlan: fetchPlan(options),
    createCustomer: createCustomer(options),
    editCustomer: editCustomer(options),
    listCustomers: listCustomers(options),
    fetchCustomer: fetchCustomer(options),
  };

  return {
    id: "razorpay",
    endpoints: {
      razorpayWebhook: razorpayWebhook(options),
      ...razorpaySpecificEndpoints,
      ...((options.subscription?.enabled
        ? subscriptionEndpoints
        : {}) as O["subscription"] extends {
        enabled: true;
      }
        ? typeof subscriptionEndpoints
        : {}),
    },
    init(ctx) {
      if (options.organization?.enabled) {
        const orgPlugin = ctx.getPlugin("organization");
        if (!orgPlugin) {
          ctx.logger.error(`Organization plugin not found`);
          return;
        }

        const existingHooks = orgPlugin.options?.organizationHooks ?? {};

        /**
         * Sync organization name to Razorpay customer
         */
        const afterUpdateRazorpayOrg = async (data: {
          organization: (Organization & WithRazorpayCustomerId) | null;
          user: User;
        }) => {
          const { organization } = data;
          if (!organization?.razorpayCustomerId) return;

          try {
            const razorpayCustomer = await (client.customers as any).fetch(
              organization.razorpayCustomerId,
            );

            if (organization.name !== razorpayCustomer.name) {
              await (client.customers as any).edit(
                organization.razorpayCustomerId,
                { name: organization.name },
              );
              ctx.logger.info(
                `Synced organization name to Razorpay: "${razorpayCustomer.name}" → "${organization.name}"`,
              );
            }
          } catch (e: any) {
            ctx.logger.error(
              `Failed to sync organization to Razorpay: ${e.message}`,
            );
          }
        };

        /**
         * Block deletion if organization has active subscriptions
         */
        const beforeDeleteRazorpayOrg = async (data: {
          organization: Organization & WithRazorpayCustomerId;
          user: User;
        }) => {
          const { organization } = data;
          if (!organization.razorpayCustomerId) return;

          try {
            const subscriptions = await ctx.adapter.findMany<Subscription>({
              model: "subscription",
              where: [
                {
                  field: "razorpayCustomerId",
                  value: organization.razorpayCustomerId,
                },
              ],
            });

            for (const sub of subscriptions) {
              if (isActive(sub)) {
                throw createAPIError(
                  "BAD_REQUEST",
                  RAZORPAY_ERROR_CODES.ORGANIZATION_HAS_ACTIVE_SUBSCRIPTION,
                );
              }
            }
          } catch (error: any) {
            if (error instanceof APIError) {
              throw error;
            }
            ctx.logger.error(
              `Failed to check organization subscriptions: ${error.message}`,
            );
            throw error;
          }
        };

        /**
         * Sync seat quantity when organization members change
         */
        const syncSeatsAfterMemberChange = async (data: {
          organization: Organization & WithRazorpayCustomerId;
        }) => {
          if (
            !options.subscription?.enabled ||
            !data.organization?.razorpayCustomerId
          ) {
            return;
          }

          try {
            const memberCount = await ctx.adapter.count({
              model: "member",
              where: [
                {
                  field: "organizationId",
                  value: data.organization.id,
                },
              ],
            });

            const plans = await getPlans(options.subscription);
            const quantityPlans = plans.filter((p) => p.quantity);
            if (quantityPlans.length === 0) return;

            const planNames = new Set(
              quantityPlans.map((p) => p.name.toLowerCase()),
            );
            const dbSub = await ctx.adapter.findOne<Subscription>({
              model: "subscription",
              where: [
                {
                  field: "referenceId",
                  value: data.organization.id,
                },
              ],
            });
            if (
              !dbSub?.razorpaySubscriptionId ||
              !isActive(dbSub) ||
              !planNames.has(dbSub.plan)
            ) {
              return;
            }

            // Update Razorpay subscription quantity
            await (client.subscriptions as any).update(
              dbSub.razorpaySubscriptionId,
              { quantity: memberCount },
            );
            await ctx.adapter.update({
              model: "subscription",
              update: { quantity: memberCount },
              where: [{ field: "id", value: dbSub.id }],
            });
          } catch (e: any) {
            ctx.logger.error(`Failed to sync seats to Razorpay: ${e.message}`);
          }
        };

        orgPlugin.options!.organizationHooks = {
          ...existingHooks,
          afterUpdateOrganization: existingHooks.afterUpdateOrganization
            ? async (data: any) => {
                await existingHooks.afterUpdateOrganization!(data);
                await afterUpdateRazorpayOrg(data);
              }
            : afterUpdateRazorpayOrg,
          beforeDeleteOrganization: existingHooks.beforeDeleteOrganization
            ? async (data: any) => {
                await existingHooks.beforeDeleteOrganization!(data);
                await beforeDeleteRazorpayOrg(data);
              }
            : beforeDeleteRazorpayOrg,
          afterAddMember: existingHooks.afterAddMember
            ? async (data: any) => {
                await existingHooks.afterAddMember!(data);
                await syncSeatsAfterMemberChange(data);
              }
            : syncSeatsAfterMemberChange,
          afterRemoveMember: existingHooks.afterRemoveMember
            ? async (data: any) => {
                await existingHooks.afterRemoveMember!(data);
                await syncSeatsAfterMemberChange(data);
              }
            : syncSeatsAfterMemberChange,
          afterAcceptInvitation: existingHooks.afterAcceptInvitation
            ? async (data: any) => {
                await existingHooks.afterAcceptInvitation!(data);
                await syncSeatsAfterMemberChange(data);
              }
            : syncSeatsAfterMemberChange,
        };
      }

      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                async after(user: User & WithRazorpayCustomerId, ctx) {
                  if (
                    !ctx ||
                    !options.createCustomerOnSignUp ||
                    user.razorpayCustomerId
                  ) {
                    return;
                  }

                  try {
                    // Check if a Razorpay customer with this email already exists
                    let existingCustomer: any;
                    try {
                      const result = await (client.customers as any).create({
                        name: user.name,
                        email: user.email,
                        fail_existing: "0", // Returns existing customer if found
                        notes: customerNotes.set({
                          userId: user.id,
                          customerType: "user",
                        }),
                      });
                      existingCustomer = result;
                    } catch (e: any) {
                      ctx.context.logger.error(
                        `Failed to create Razorpay customer: ${e.message}`,
                      );
                      return;
                    }

                    if (existingCustomer) {
                      await ctx.context.internalAdapter.updateUser(user.id, {
                        razorpayCustomerId: existingCustomer.id,
                      });

                      await options.onCustomerCreate?.(
                        {
                          razorpayCustomer: existingCustomer,
                          user: {
                            ...user,
                            razorpayCustomerId: existingCustomer.id,
                          },
                        },
                        ctx,
                      );

                      ctx.context.logger.info(
                        `Linked Razorpay customer ${existingCustomer.id} to user ${user.id}`,
                      );
                    }
                  } catch (e: any) {
                    ctx.context.logger.error(
                      `Failed to create or link Razorpay customer: ${e.message}`,
                      e,
                    );
                  }
                },
              },
              update: {
                async after(user: User & WithRazorpayCustomerId, ctx) {
                  if (!ctx || !user.razorpayCustomerId) return;

                  try {
                    const razorpayCustomer = await (
                      client.customers as any
                    ).fetch(user.razorpayCustomerId);

                    // Sync email if changed
                    if (razorpayCustomer.email !== user.email) {
                      await (client.customers as any).edit(
                        user.razorpayCustomerId,
                        { email: user.email },
                      );
                      ctx.context.logger.info(
                        `Updated Razorpay customer email from ${razorpayCustomer.email} to ${user.email}`,
                      );
                    }
                  } catch (e: any) {
                    ctx.context.logger.error(
                      `Failed to sync email to Razorpay customer: ${e.message}`,
                      e,
                    );
                  }
                },
              },
            },
          },
        },
      };
    },
    schema: getSchema(options),
    options: options as NoInfer<O>,
    $ERROR_CODES: RAZORPAY_ERROR_CODES,
  } satisfies BetterAuthPlugin;
};

export type RazorpayPlugin<O extends RazorpayOptions> = ReturnType<
  typeof razorpay<O>
>;
