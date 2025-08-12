import type { InferOptionSchema, Session, User } from "better-auth";
import type Razorpay from "razorpay";
import type { Customers } from "razorpay/dist/types/customers";
import type { Subscriptions } from "razorpay/dist/types/subscriptions";
import type { subscriptions, user } from "./schema";

export type RazorpayPlan = {
  /**
   * The Plan ID from your Razorpay Dashboard for the monthly billing cycle.
   */
  monthlyPlanId: string;
  /**
   * The Plan ID from your Razorpay Dashboard for the discounted annual billing cycle.
   */
  annualPlanId?: string;
  /**
   * A unique name for the plan (e.g., "Pro", "Starter").
   * This is used to identify the plan in your application logic.
   */
  name: string;
  /**
   * A record of limits associated with this plan (e.g., { users: 10 }).
   * This is for your application's use and is not sent to Razorpay.
   */
  limits?: Record<string, number>;
  /**
   * A group name, useful if a user can be subscribed to multiple types of plans simultaneously.
   */
  group?: string;
  /**
   * Configuration for a free trial period.
   */
  freeTrial?: {
    /**
     * The number of days the free trial should last.
     */
    days: number;
    /**
     * A callback function that runs when a trial starts.
     */
    onTrialStart?: (subscription: Subscription) => Promise<void>;
    /**
     * A callback function that runs when a trial ends and the subscription becomes active.
     */
    onTrialEnd?: (
      data: { subscription: Subscription },
      request?: Request
    ) => Promise<void>;
  };
};

export interface Subscription {
  id: string;
  plan: string;
  referenceId: string;
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
  status:
    | "created"
    | "active"
    | "pending"
    | "halted"
    | "cancelled"
    | "completed"
    | "expired"
    | "trialing";
  trialStart?: Date;
  trialEnd?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  seats?: number;
  groupId?: string;
}

export interface RazorpayOptions {
  razorpayClient: Razorpay;
  razorpayWebhookSecret: string;
  createCustomerOnSignUp?: boolean;
  onCustomerCreate?: (data: {
    user: User;
    razorpayCustomer: any;
  }) => Promise<void>;
  getCustomerCreateParams?: (
    data: {
      user: User & Record<string, any>;
      session?: Session & Record<string, any>;
    },
    request?: Request
  ) =>
    | Promise<{
        params?: Partial<Customers.RazorpayCustomerCreateRequestBody>;
      }>
    | {
        params?: Partial<Customers.RazorpayCustomerCreateRequestBody>;
      };
  subscription?: {
    enabled: boolean;
    plans: RazorpayPlan[] | (() => Promise<RazorpayPlan[]>);
    requireEmailVerification?: boolean;
    /**
     * Callback when a subscription is successfully activated (after payment)
     */
    onSubscriptionComplete?: (data: {
      event: any;
      subscription: Subscription;
      razorpaySubscription: any;
      plan: RazorpayPlan;
    }) => Promise<void>;
    onSubscriptionCreated?: (data: {
      razorpaySubscription: Subscriptions.RazorpaySubscription;
      subscription: Subscription;
      plan: RazorpayPlan;
    }) => Promise<void>;
    /**
     * A callback to run after a subscription is updated.
     */
    onSubscriptionUpdate?: (data: {
      event: any;
      subscription: Subscription;
    }) => Promise<void>;
    /**
     * A callback to run after a subscription is cancelled or scheduled for cancellation.
     */
    onSubscriptionCancel?: (data: {
      event?: any;
      subscription: Subscription;
      razorpaySubscription: Subscriptions.RazorpaySubscription;
    }) => Promise<void>;
    authorizeReference?: (
      data: {
        user: User & Record<string, any>;
        session: Session & Record<string, any>;
        referenceId: string;
        action:
          | "create-subscription"
          | "list-subscription"
          | "cancel-subscription"
          | "restore-subscription"
          | "billing-portal";
      },
      request?: Request
    ) => Promise<boolean>;
    getSubscriptionCreateParams?: (
      data: {
        user: User & Record<string, any>;
        session: Session & Record<string, any>;
        plan: RazorpayPlan;
        subscription?: Subscription;
      },
      request?: Request
    ) =>
      | Promise<{
          params?: Partial<Subscriptions.RazorpaySubscriptionCreateRequestBody>;
        }>
      | {
          params?: Partial<Subscriptions.RazorpaySubscriptionCreateRequestBody>;
        };
  };
  onEvent?: (event: any) => Promise<void>;
  schema?: InferOptionSchema<typeof subscriptions & typeof user>;
}

export interface InputSubscription extends Omit<Subscription, "id"> {}
