import type {
  GenericEndpointContext,
  InferOptionSchema,
  Session,
  User,
} from "better-auth";
import type { Organization } from "better-auth/plugins/organization";
import type Razorpay from "razorpay";
import type { organization, subscriptions, user } from "./schema";

export type AuthorizeReferenceAction =
  | "upgrade-subscription"
  | "list-subscription"
  | "cancel-subscription"
  | "pause-subscription"
  | "resume-subscription"
  | "update-subscription";

export type CustomerType = "user" | "organization";

export type WithRazorpayCustomerId = {
  razorpayCustomerId?: string;
};

// TODO: Types extended by a plugin should be moved into that plugin.
export type WithActiveOrganizationId = {
  activeOrganizationId?: string;
};

export type RazorpayCtxSession = {
  session: Session & WithActiveOrganizationId;
  user: User & WithRazorpayCustomerId;
};

/**
 * Razorpay subscription status lifecycle.
 *
 * @see https://razorpay.com/docs/payments/subscriptions/states/
 */
export type RazorpaySubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired"
  | "paused";

export type RazorpayPlan = {
  /**
   * Razorpay Plan ID (e.g., plan_00000000000001)
   */
  planId: string;
  /**
   * Annual/discount plan ID for yearly billing
   */
  annualPlanId?: string | undefined;
  /**
   * Plan name
   */
  name: string;
  /**
   * Limits for the plan
   *
   * useful when you want to define plan-specific metadata.
   */
  limits?: Record<string, unknown> | undefined;
  /**
   * Plan group name
   *
   * useful when you want to group plans or
   * when a user can subscribe to multiple plans.
   */
  group?: string | undefined;
  /**
   * Number of billing cycles (total_count) for the subscription.
   * If not set, defaults will be used.
   */
  totalCount?: number | undefined;
  /**
   * Quantity for seat-based billing.
   * This is the number of times the plan amount
   * is charged per invoice.
   *
   * Requires the `organization` plugin. Member changes
   * automatically sync the seat quantity.
   */
  quantity?: number | undefined;
  /**
   * Free trial configuration
   */
  freeTrial?:
    | {
        /**
         * Number of days for the free trial.
         * Maps to Razorpay's `start_at` offset.
         */
        days: number;
        /**
         * A function that will be called when the trial starts.
         */
        onTrialStart?: (subscription: Subscription) => Promise<void>;
        /**
         * A function that will be called when the trial
         * ends (subscription goes active).
         */
        onTrialEnd?: (
          data: {
            subscription: Subscription;
          },
          ctx: GenericEndpointContext,
        ) => Promise<void>;
      }
    | undefined;
};

export interface Subscription {
  /**
   * Database identifier
   */
  id: string;
  /**
   * The plan name
   */
  plan: string;
  /**
   * Razorpay customer id
   */
  razorpayCustomerId?: string | undefined;
  /**
   * Razorpay subscription id
   */
  razorpaySubscriptionId?: string | undefined;
  /**
   * Razorpay plan id
   */
  razorpayPlanId?: string | undefined;
  /**
   * To what reference id the subscription belongs to
   * @example
   * - userId for a user
   * - workspace id for a saas platform
   * - website id for a hosting platform
   *
   * @default - userId
   */
  referenceId: string;
  /**
   * Subscription status
   */
  status: RazorpaySubscriptionStatus;
  /**
   * The current billing cycle start date (Unix timestamp)
   */
  currentStart?: Date | undefined;
  /**
   * The current billing cycle end date (Unix timestamp)
   */
  currentEnd?: Date | undefined;
  /**
   * When the subscription ended (cancelled/completed)
   */
  endedAt?: Date | undefined;
  /**
   * Number of seats/quantity
   */
  quantity?: number | undefined;
  /**
   * Total number of billing cycles
   */
  totalCount?: number | undefined;
  /**
   * Number of billing cycles already charged
   */
  paidCount?: number | undefined;
  /**
   * Remaining billing cycles
   */
  remainingCount?: number | undefined;
  /**
   * When the subscription was cancelled
   */
  cancelledAt?: Date | undefined;
  /**
   * When the subscription was paused
   */
  pausedAt?: Date | undefined;
  /**
   * Short URL for payment authorization
   */
  shortUrl?: string | undefined;
  /**
   * Whether cancellation is scheduled at cycle end
   */
  cancelAtCycleEnd?: boolean | undefined;
  /**
   * A field to group subscriptions so you can have multiple subscriptions
   * for one reference id
   */
  groupId?: string | undefined;
  /**
   * The billing period (daily, weekly, monthly, quarterly, yearly)
   */
  billingPeriod?: string | undefined;
}

/**
 * Razorpay webhook event payload structure
 */
export interface RazorpayWebhookEvent {
  entity: "event";
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: {
      entity: RazorpaySubscriptionEntity;
    };
    payment?: {
      entity: Record<string, unknown>;
    };
  };
  created_at: number;
}

/**
 * Razorpay Subscription response entity
 */
export interface RazorpaySubscriptionEntity {
  id: string;
  entity: "subscription";
  plan_id: string;
  customer_id?: string;
  status: RazorpaySubscriptionStatus;
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  quantity: number;
  notes: Record<string, string> | string[];
  charge_at: number | null;
  start_at: number;
  end_at: number;
  auth_attempts: number;
  total_count: number;
  paid_count: number;
  customer_notify: boolean;
  created_at: number;
  expire_by: number | null;
  short_url: string | null;
  has_scheduled_changes: boolean;
  change_scheduled_at: number | null;
  source: string;
  offer_id?: string;
  remaining_count: number;
  paused_at?: number;
  pause_initiated_by?: string | null;
  cancel_initiated_by?: string | null;
  payment_method?: string;
}

export type SubscriptionOptions = {
  /**
   * List of plans
   */
  plans: RazorpayPlan[] | (() => RazorpayPlan[] | Promise<RazorpayPlan[]>);
  /**
   * Require email verification before a user is allowed to upgrade
   * their subscriptions
   *
   * @default false
   */
  requireEmailVerification?: boolean | undefined;
  /**
   * A callback to run after a subscription is activated
   * (first payment success)
   */
  onSubscriptionActivated?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
        plan: RazorpayPlan;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run after a subscription is charged
   * (recurring payment success)
   */
  onSubscriptionCharged?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run after a subscription is authenticated
   */
  onSubscriptionAuthenticated?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run after a subscription is cancelled
   */
  onSubscriptionCancelled?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run after a subscription is paused
   */
  onSubscriptionPaused?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run after a subscription is resumed
   */
  onSubscriptionResumed?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run when a subscription payment is halted
   * (retries exhausted)
   */
  onSubscriptionHalted?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run when a subscription payment is pending
   * (retry in progress)
   */
  onSubscriptionPending?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run when a subscription is completed
   * (all billing cycles done)
   */
  onSubscriptionCompleted?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A callback to run when a subscription is updated
   * (plan change, quantity change)
   */
  onSubscriptionUpdated?:
    | ((data: {
        event: RazorpayWebhookEvent;
        razorpaySubscription: RazorpaySubscriptionEntity;
        subscription: Subscription;
      }) => Promise<void>)
    | undefined;
  /**
   * A function to check if the reference id is valid
   * and belongs to the user
   */
  authorizeReference?:
    | ((
        data: {
          user: User & Record<string, any>;
          session: Session & Record<string, any>;
          referenceId: string;
          action: AuthorizeReferenceAction;
        },
        ctx: GenericEndpointContext,
      ) => Promise<boolean>)
    | undefined;
  /**
   * Custom parameters for Razorpay subscription creation
   */
  getSubscriptionCreateParams?:
    | ((
        data: {
          user: User & Record<string, any>;
          session: Session & Record<string, any>;
          plan: RazorpayPlan;
        },
        ctx: GenericEndpointContext,
      ) => Promise<Record<string, unknown>>)
    | undefined;
};

export interface RazorpayOptions {
  /**
   * Razorpay Client instance
   */
  razorpayClient: InstanceType<typeof Razorpay>;
  /**
   * Razorpay Webhook Secret
   *
   * @description Used for HMAC-SHA256 signature verification
   */
  razorpayWebhookSecret: string;
  /**
   * Enable customer creation when a user signs up
   */
  createCustomerOnSignUp?: boolean | undefined;
  /**
   * A callback to run after a customer has been created
   */
  onCustomerCreate?:
    | ((
        data: {
          razorpayCustomer: {
            id: string;
            entity: string;
            name: string;
            email: string;
            contact: string;
          };
          user: User & WithRazorpayCustomerId;
        },
        ctx: GenericEndpointContext,
      ) => Promise<void>)
    | undefined;
  /**
   * Custom function to get customer create params
   */
  getCustomerCreateParams?:
    | ((
        user: User,
        ctx: GenericEndpointContext,
      ) => Promise<Record<string, unknown>>)
    | undefined;
  /**
   * Subscriptions
   */
  subscription?:
    | (
        | {
            enabled: false;
          }
        | ({
            enabled: true;
          } & SubscriptionOptions)
      )
    | undefined;
  /**
   * Organization Razorpay integration
   *
   * Enable organizations to have their own Razorpay customer ID
   */
  organization?:
    | {
        /**
         * Enable organization Razorpay customer
         */
        enabled: true;
        /**
         * Custom function to get customer create params
         * for organization customers
         */
        getCustomerCreateParams?:
          | ((
              organization: Organization,
              ctx: GenericEndpointContext,
            ) => Promise<Record<string, unknown>>)
          | undefined;
        /**
         * A callback to run after an organization customer has been created
         */
        onCustomerCreate?:
          | ((
              data: {
                razorpayCustomer: {
                  id: string;
                  entity: string;
                  name: string;
                  email: string;
                };
                organization: Organization & WithRazorpayCustomerId;
              },
              ctx: GenericEndpointContext,
            ) => Promise<void>)
          | undefined;
      }
    | undefined;
  /**
   * A callback to run after a Razorpay webhook event is received
   */
  onEvent?: ((event: RazorpayWebhookEvent) => Promise<void>) | undefined;
  /**
   * Schema for the razorpay plugin
   */
  schema?:
    | InferOptionSchema<
        typeof subscriptions & typeof user & typeof organization
      >
    | undefined;
}
