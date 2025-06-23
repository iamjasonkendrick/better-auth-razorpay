import * as better_auth from 'better-auth';
import { User, Session, InferOptionSchema, GenericEndpointContext } from 'better-auth';
import * as razorpay_dist_types_api from 'razorpay/dist/types/api';
import * as razorpay_dist_types_subscriptions from 'razorpay/dist/types/subscriptions';
import { Subscriptions } from 'razorpay/dist/types/subscriptions';
import * as better_call from 'better-call';
import { APIError } from 'better-auth/api';
import { z } from 'zod';
import Razorpay from 'razorpay';
import { Customers } from 'razorpay/dist/types/customers';

declare const subscriptions: {
    subscription: {
        fields: {
            plan: {
                type: "string";
                required: true;
            };
            referenceId: {
                type: "string";
                required: true;
            };
            razorpayCustomerId: {
                type: "string";
                required: false;
            };
            razorpaySubscriptionId: {
                type: "string";
                required: false;
            };
            status: {
                type: "string";
                defaultValue: string;
            };
            periodStart: {
                type: "date";
                required: false;
            };
            periodEnd: {
                type: "date";
                required: false;
            };
            cancelAtPeriodEnd: {
                type: "boolean";
                required: false;
                defaultValue: false;
            };
            seats: {
                type: "number";
                required: false;
            };
            trialStart: {
                type: "date";
                required: false;
            };
            trialEnd: {
                type: "date";
                required: false;
            };
            groupId: {
                type: "string";
                required: false;
            };
        };
    };
};
declare const user: {
    user: {
        fields: {
            razorpayCustomerId: {
                type: "string";
                required: false;
            };
        };
    };
};

type RazorpayPlan = {
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
        onTrialEnd?: (data: {
            subscription: Subscription;
        }, request?: Request) => Promise<void>;
    };
};
interface Subscription {
    id: string;
    plan: string;
    referenceId: string;
    razorpayCustomerId?: string;
    razorpaySubscriptionId?: string;
    status: "created" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired" | "trialing";
    trialStart?: Date;
    trialEnd?: Date;
    periodStart?: Date;
    periodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    seats?: number;
    groupId?: string;
}
interface RazorpayOptions {
    razorpayClient: Razorpay;
    razorpayWebhookSecret: string;
    createCustomerOnSignUp?: boolean;
    onCustomerCreate?: (data: {
        user: User;
        razorpayCustomer: any;
    }) => Promise<void>;
    getCustomerCreateParams?: (data: {
        user: User & Record<string, any>;
        session?: Session & Record<string, any>;
    }, request?: Request) => Promise<{
        params?: Partial<Customers.RazorpayCustomerCreateRequestBody>;
    }> | {
        params?: Partial<Customers.RazorpayCustomerCreateRequestBody>;
    };
    subscription?: {
        enabled: boolean;
        plans: RazorpayPlan[] | (() => Promise<RazorpayPlan[]>);
        requireEmailVerification?: boolean;
        onSubscriptionCreated?: (data: {
            razorpaySubscription: Subscriptions.RazorpaySubscription;
            subscription: Subscription;
            plan: RazorpayPlan;
        }) => Promise<void>;
        onSubscriptionActivated?: (data: {
            event: any;
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
        authorizeReference?: (data: {
            user: User & Record<string, any>;
            session: Session & Record<string, any>;
            referenceId: string;
            action: "create-subscription" | "list-subscription" | "cancel-subscription" | "restore-subscription";
        }, request?: Request) => Promise<boolean>;
        getSubscriptionCreateParams?: (data: {
            user: User & Record<string, any>;
            session: Session & Record<string, any>;
            plan: RazorpayPlan;
            subscription?: Subscription;
        }, request?: Request) => Promise<{
            params?: Partial<Subscriptions.RazorpaySubscriptionCreateRequestBody>;
        }> | {
            params?: Partial<Subscriptions.RazorpaySubscriptionCreateRequestBody>;
        };
    };
    onEvent?: (event: any) => Promise<void>;
    schema?: InferOptionSchema<typeof subscriptions & typeof user>;
}

declare const razorpay: <O extends RazorpayOptions>(options: O) => {
    id: "razorpay";
    endpoints: {
        razorpayWebhook: {
            <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0?: ({
                body?: undefined;
            } & {
                method?: "POST" | undefined;
            } & {
                query?: Record<string, any> | undefined;
            } & {
                params?: Record<string, any>;
            } & {
                request?: Request;
            } & {
                headers?: HeadersInit;
            } & {
                asResponse?: boolean;
                returnHeaders?: boolean;
                use?: better_call.Middleware[];
                path?: string;
            } & {
                asResponse?: AsResponse | undefined;
                returnHeaders?: ReturnHeaders | undefined;
            }) | undefined): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                headers: Headers;
                response: {
                    success: boolean;
                };
            } : {
                success: boolean;
            }>;
            options: {
                method: "POST";
                metadata: {
                    isAction: boolean;
                };
                cloneRequest: true;
            } & {
                use: any[];
            };
            path: "/razorpay/webhook";
        };
    } & (O["subscription"] extends {
        enabled: true;
    } ? {
        /**
         * Creates a new subscription or updates an existing one (upgrade/downgrade).
         * This is the Razorpay equivalent of Stripe's `upgradeSubscription` endpoint.
         */
        createOrUpdateSubscription: {
            <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                body: {
                    plan: string;
                    annual?: boolean | undefined;
                    referenceId?: string | undefined;
                    subscriptionId?: string | undefined;
                    seats?: number | undefined;
                    successUrl?: string | undefined;
                    disableRedirect?: boolean | undefined;
                };
            } & {
                method?: "POST" | undefined;
            } & {
                query?: Record<string, any> | undefined;
            } & {
                params?: Record<string, any>;
            } & {
                request?: Request;
            } & {
                headers?: HeadersInit;
            } & {
                asResponse?: boolean;
                returnHeaders?: boolean;
                use?: better_call.Middleware[];
                path?: string;
            } & {
                asResponse?: AsResponse | undefined;
                returnHeaders?: ReturnHeaders | undefined;
            }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                headers: Headers;
                response: {
                    redirect: boolean;
                    id: string;
                    entity: string;
                    status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired";
                    current_start?: number | null;
                    current_end?: number | null;
                    ended_at?: number | null;
                    charge_at: number;
                    start_at: number;
                    end_at: number;
                    auth_attempts: number;
                    paid_count: number;
                    created_at: number;
                    short_url: string;
                    has_scheduled_changes: boolean;
                    change_scheduled_at?: number | null;
                    source: string;
                    remaining_count: string;
                    customer_id: string | null;
                    payment_method: string | null;
                    plan_id: string;
                    total_count: number;
                    customer_notify?: boolean | 0 | 1;
                    quantity?: number;
                    offer_id?: string;
                    expire_by?: number;
                    addons?: Pick<razorpay_dist_types_subscriptions.Subscriptions.RazorpaySubscriptionAddonsBaseRequestBody, "item">[];
                    notes?: razorpay_dist_types_api.IMap<string | number>;
                    schedule_change_at?: "now" | "cycle_end";
                };
            } : {
                redirect: boolean;
                id: string;
                entity: string;
                status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired";
                current_start?: number | null;
                current_end?: number | null;
                ended_at?: number | null;
                charge_at: number;
                start_at: number;
                end_at: number;
                auth_attempts: number;
                paid_count: number;
                created_at: number;
                short_url: string;
                has_scheduled_changes: boolean;
                change_scheduled_at?: number | null;
                source: string;
                remaining_count: string;
                customer_id: string | null;
                payment_method: string | null;
                plan_id: string;
                total_count: number;
                customer_notify?: boolean | 0 | 1;
                quantity?: number;
                offer_id?: string;
                expire_by?: number;
                addons?: Pick<razorpay_dist_types_subscriptions.Subscriptions.RazorpaySubscriptionAddonsBaseRequestBody, "item">[];
                notes?: razorpay_dist_types_api.IMap<string | number>;
                schedule_change_at?: "now" | "cycle_end";
            }>;
            options: {
                method: "POST";
                body: z.ZodObject<{
                    plan: z.ZodString;
                    annual: z.ZodOptional<z.ZodBoolean>;
                    referenceId: z.ZodOptional<z.ZodString>;
                    subscriptionId: z.ZodOptional<z.ZodString>;
                    seats: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
                    successUrl: z.ZodDefault<z.ZodString>;
                    disableRedirect: z.ZodDefault<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    plan: string;
                    seats: number;
                    successUrl: string;
                    disableRedirect: boolean;
                    annual?: boolean | undefined;
                    referenceId?: string | undefined;
                    subscriptionId?: string | undefined;
                }, {
                    plan: string;
                    annual?: boolean | undefined;
                    referenceId?: string | undefined;
                    subscriptionId?: string | undefined;
                    seats?: number | undefined;
                    successUrl?: string | undefined;
                    disableRedirect?: boolean | undefined;
                }>;
                use: (((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            token: string;
                            userId: string;
                            expiresAt: Date;
                            createdAt: Date;
                            updatedAt: Date;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            name: string;
                            emailVerified: boolean;
                            email: string;
                            createdAt: Date;
                            updatedAt: Date;
                            image?: string | null | undefined;
                        };
                    };
                }>) | ((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<void>))[];
            } & {
                use: any[];
            };
            path: "/subscription/create-or-update";
        };
        /**
         * Callback endpoint after user cancels via a Razorpay-hosted page (if such a flow is used).
         * This mirrors Stripe's `cancelSubscriptionCallback`. Razorpay's direct subscription management
         * often doesn't involve a redirect-based cancel flow like Stripe's Billing Portal.
         * This endpoint is kept for structural parity; its direct applicability depends on
         * how cancellations are initiated (API vs. potential future Razorpay portal).
         * For API-initiated cancellations, webhooks are primary.
         */
        cancelSubscriptionCallback: {
            <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0?: ({
                body?: undefined;
            } & {
                method?: "GET" | undefined;
            } & {
                query?: Record<string, any> | undefined;
            } & {
                params?: Record<string, any>;
            } & {
                request?: Request;
            } & {
                headers?: HeadersInit;
            } & {
                asResponse?: boolean;
                returnHeaders?: boolean;
                use?: better_call.Middleware[];
                path?: string;
            } & {
                asResponse?: AsResponse | undefined;
                returnHeaders?: ReturnHeaders | undefined;
            }) | undefined): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                headers: Headers;
                response: APIError;
            } : APIError>;
            options: {
                method: "GET";
                query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                use: ((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<void>)[];
            } & {
                use: any[];
            };
            path: "/subscription/cancel/callback";
        };
        /**
         * Cancels a subscription via API.
         */
        cancelSubscription: {
            <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                body: {
                    subscriptionId: string;
                    referenceId?: string | undefined;
                    immediately?: boolean | undefined;
                };
            } & {
                method?: "POST" | undefined;
            } & {
                query?: Record<string, any> | undefined;
            } & {
                params?: Record<string, any>;
            } & {
                request?: Request;
            } & {
                headers?: HeadersInit;
            } & {
                asResponse?: boolean;
                returnHeaders?: boolean;
                use?: better_call.Middleware[];
                path?: string;
            } & {
                asResponse?: AsResponse | undefined;
                returnHeaders?: ReturnHeaders | undefined;
            }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                headers: Headers;
                response: razorpay_dist_types_subscriptions.Subscriptions.RazorpaySubscription;
            } : razorpay_dist_types_subscriptions.Subscriptions.RazorpaySubscription>;
            options: {
                method: "POST";
                body: z.ZodObject<{
                    subscriptionId: z.ZodString;
                    referenceId: z.ZodOptional<z.ZodString>;
                    immediately: z.ZodDefault<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    subscriptionId: string;
                    immediately: boolean;
                    referenceId?: string | undefined;
                }, {
                    subscriptionId: string;
                    referenceId?: string | undefined;
                    immediately?: boolean | undefined;
                }>;
                use: (((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            token: string;
                            userId: string;
                            expiresAt: Date;
                            createdAt: Date;
                            updatedAt: Date;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            name: string;
                            emailVerified: boolean;
                            email: string;
                            createdAt: Date;
                            updatedAt: Date;
                            image?: string | null | undefined;
                        };
                    };
                }>) | ((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<void>))[];
            } & {
                use: any[];
            };
            path: "/subscription/cancel";
        };
        /**
         * Restores a subscription that was scheduled for cancellation at period end.
         */
        restoreSubscription: {
            <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                body: {
                    subscriptionId: string;
                    referenceId?: string | undefined;
                };
            } & {
                method?: "POST" | undefined;
            } & {
                query?: Record<string, any> | undefined;
            } & {
                params?: Record<string, any>;
            } & {
                request?: Request;
            } & {
                headers?: HeadersInit;
            } & {
                asResponse?: boolean;
                returnHeaders?: boolean;
                use?: better_call.Middleware[];
                path?: string;
            } & {
                asResponse?: AsResponse | undefined;
                returnHeaders?: ReturnHeaders | undefined;
            }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                headers: Headers;
                response: razorpay_dist_types_subscriptions.Subscriptions.RazorpaySubscription;
            } : razorpay_dist_types_subscriptions.Subscriptions.RazorpaySubscription>;
            options: {
                method: "POST";
                body: z.ZodObject<{
                    subscriptionId: z.ZodString;
                    referenceId: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    subscriptionId: string;
                    referenceId?: string | undefined;
                }, {
                    subscriptionId: string;
                    referenceId?: string | undefined;
                }>;
                use: (((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            token: string;
                            userId: string;
                            expiresAt: Date;
                            createdAt: Date;
                            updatedAt: Date;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            name: string;
                            emailVerified: boolean;
                            email: string;
                            createdAt: Date;
                            updatedAt: Date;
                            image?: string | null | undefined;
                        };
                    };
                }>) | ((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<void>))[];
            } & {
                use: any[];
            };
            path: "/subscription/restore";
        };
        /**
         * Lists active and trialing subscriptions for the referenceId.
         */
        listActiveSubscriptions: {
            <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0?: ({
                body?: undefined;
            } & {
                method?: "GET" | undefined;
            } & {
                query?: {
                    referenceId?: string | undefined;
                } | undefined;
            } & {
                params?: Record<string, any>;
            } & {
                request?: Request;
            } & {
                headers?: HeadersInit;
            } & {
                asResponse?: boolean;
                returnHeaders?: boolean;
                use?: better_call.Middleware[];
                path?: string;
            } & {
                asResponse?: AsResponse | undefined;
                returnHeaders?: ReturnHeaders | undefined;
            }) | undefined): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                headers: Headers;
                response: {
                    limits: Record<string, number> | undefined;
                    id: string;
                    plan: string;
                    referenceId: string;
                    razorpayCustomerId?: string;
                    razorpaySubscriptionId?: string;
                    status: "created" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired" | "trialing";
                    trialStart?: Date;
                    trialEnd?: Date;
                    periodStart?: Date;
                    periodEnd?: Date;
                    cancelAtPeriodEnd?: boolean;
                    seats?: number;
                    groupId?: string;
                }[];
            } : {
                limits: Record<string, number> | undefined;
                id: string;
                plan: string;
                referenceId: string;
                razorpayCustomerId?: string;
                razorpaySubscriptionId?: string;
                status: "created" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired" | "trialing";
                trialStart?: Date;
                trialEnd?: Date;
                periodStart?: Date;
                periodEnd?: Date;
                cancelAtPeriodEnd?: boolean;
                seats?: number;
                groupId?: string;
            }[]>;
            options: {
                method: "GET";
                query: z.ZodOptional<z.ZodObject<{
                    referenceId: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    referenceId?: string | undefined;
                }, {
                    referenceId?: string | undefined;
                }>>;
                use: (((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            token: string;
                            userId: string;
                            expiresAt: Date;
                            createdAt: Date;
                            updatedAt: Date;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            name: string;
                            emailVerified: boolean;
                            email: string;
                            createdAt: Date;
                            updatedAt: Date;
                            image?: string | null | undefined;
                        };
                    };
                }>) | ((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<void>))[];
            } & {
                use: any[];
            };
            path: "/subscription/list";
        };
        /**
         * Callback endpoint after successful Razorpay checkout. Updates local DB for immediate UX.
         */
        subscriptionSuccess: {
            <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0?: ({
                body?: undefined;
            } & {
                method?: "GET" | undefined;
            } & {
                query?: Record<string, any> | undefined;
            } & {
                params?: Record<string, any>;
            } & {
                request?: Request;
            } & {
                headers?: HeadersInit;
            } & {
                asResponse?: boolean;
                returnHeaders?: boolean;
                use?: better_call.Middleware[];
                path?: string;
            } & {
                asResponse?: AsResponse | undefined;
                returnHeaders?: ReturnHeaders | undefined;
            }) | undefined): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                headers: Headers;
                response: APIError;
            } : APIError>;
            options: {
                method: "GET";
                query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                use: ((inputContext: better_call.MiddlewareInputContext<better_call.MiddlewareOptions>) => Promise<void>)[];
            } & {
                use: any[];
            };
            path: "/subscription/success";
        };
    } : {});
    init(ctx: better_auth.AuthContext): {
        options: {
            databaseHooks: {
                user: {
                    create: {
                        after(user: {
                            id: string;
                            name: string;
                            emailVerified: boolean;
                            email: string;
                            createdAt: Date;
                            updatedAt: Date;
                            image?: string | null | undefined;
                        }, hookCtx: GenericEndpointContext | undefined): Promise<void>;
                    };
                };
            };
        };
    };
    schema: {
        user: {
            fields: {
                razorpayCustomerId: {
                    type: "string";
                    required: false;
                };
            };
        };
        subscription?: {
            fields: {
                plan: {
                    type: "string";
                    required: true;
                };
                referenceId: {
                    type: "string";
                    required: true;
                };
                razorpayCustomerId: {
                    type: "string";
                    required: false;
                };
                razorpaySubscriptionId: {
                    type: "string";
                    required: false;
                };
                status: {
                    type: "string";
                    defaultValue: string;
                };
                periodStart: {
                    type: "date";
                    required: false;
                };
                periodEnd: {
                    type: "date";
                    required: false;
                };
                cancelAtPeriodEnd: {
                    type: "boolean";
                    required: false;
                    defaultValue: false;
                };
                seats: {
                    type: "number";
                    required: false;
                };
                trialStart: {
                    type: "date";
                    required: false;
                };
                trialEnd: {
                    type: "date";
                    required: false;
                };
                groupId: {
                    type: "string";
                    required: false;
                };
            };
        } | undefined;
    };
};

export { razorpay };
export type { RazorpayPlan, Subscription };
