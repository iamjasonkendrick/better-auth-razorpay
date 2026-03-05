/**
 * Pre-built TanStack Query (React Query) hooks for the Razorpay plugin.
 *
 * @example
 * ```tsx
 * import { useSubscription, useSubscriptionList } from "better-auth-razorpay/react";
 *
 * function BillingPage() {
 *   const { data: subscription, isLoading } = useSubscription(authClient);
 *   const { data: subscriptions } = useSubscriptionList(authClient);
 *   // ...
 * }
 * ```
 *
 * @module
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { Subscription } from "./types";

// ─── Type Helpers ────────────────────────────────────────────────────────────

/**
 * Any auth client that has the Razorpay plugin methods.
 * We use `any` generics to avoid coupling to a specific client shape.
 */
type RazorpayAuthClient = {
  subscription: {
    upgrade: (body: any) => Promise<any>;
    cancel: (body: any) => Promise<any>;
    list: (query?: any) => Promise<any>;
    pause: (body: any) => Promise<any>;
    resume: (body: any) => Promise<any>;
    restore: (body: any) => Promise<any>;
    update: (body: any) => Promise<any>;
    get: (query: any) => Promise<any>;
  };
  razorpay: {
    subscription: {
      get: (query: any) => Promise<any>;
      invoices: (query: any) => Promise<any>;
      pendingUpdate: (query: any) => Promise<any>;
    };
    plan: {
      list: (query?: any) => Promise<any>;
      get: (query: any) => Promise<any>;
    };
  };
};

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const razorpayQueryKeys = {
  all: ["razorpay"] as const,
  subscriptions: () => [...razorpayQueryKeys.all, "subscriptions"] as const,
  subscriptionList: (referenceId?: string, customerType?: string) =>
    [
      ...razorpayQueryKeys.subscriptions(),
      "list",
      { referenceId, customerType },
    ] as const,
  subscription: (subscriptionId: string) =>
    [...razorpayQueryKeys.subscriptions(), "detail", subscriptionId] as const,
  razorpaySubscription: (subscriptionId: string) =>
    [
      ...razorpayQueryKeys.subscriptions(),
      "razorpay",
      subscriptionId,
    ] as const,
  invoices: (subscriptionId: string) =>
    [...razorpayQueryKeys.subscriptions(), "invoices", subscriptionId] as const,
  pendingUpdate: (subscriptionId: string) =>
    [
      ...razorpayQueryKeys.subscriptions(),
      "pending-update",
      subscriptionId,
    ] as const,
  plans: () => [...razorpayQueryKeys.all, "plans"] as const,
  plan: (planId: string) =>
    [...razorpayQueryKeys.plans(), "detail", planId] as const,
};

// ─── Query Hooks ─────────────────────────────────────────────────────────────

/**
 * Fetch the list of subscriptions for the current user or reference.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSubscriptionList(authClient, {
 *   referenceId: "org_123",
 *   customerType: "organization",
 * });
 * ```
 */
export function useSubscriptionList(
  authClient: RazorpayAuthClient,
  options?: {
    referenceId?: string;
    customerType?: "user" | "organization";
    queryOptions?: Omit<
      UseQueryOptions<Subscription[], Error>,
      "queryKey" | "queryFn"
    >;
  },
) {
  const referenceId = options?.referenceId;
  const customerType = options?.customerType;

  return useQuery<Subscription[], Error>({
    queryKey: razorpayQueryKeys.subscriptionList(referenceId, customerType),
    queryFn: async () => {
      const { data, error } = await authClient.subscription.list({
        query: {
          ...(referenceId ? { referenceId } : {}),
          ...(customerType ? { customerType } : {}),
        },
      });
      if (error) throw error;
      return data as Subscription[];
    },
    ...options?.queryOptions,
  });
}

/**
 * Fetch a single subscription by its local database ID.
 *
 * @example
 * ```tsx
 * const { data: subscription } = useSubscription(authClient, "sub_123");
 * ```
 */
export function useSubscription(
  authClient: RazorpayAuthClient,
  subscriptionId: string,
  options?: {
    referenceId?: string;
    customerType?: "user" | "organization";
    queryOptions?: Omit<
      UseQueryOptions<Subscription, Error>,
      "queryKey" | "queryFn"
    >;
  },
) {
  return useQuery<Subscription, Error>({
    queryKey: razorpayQueryKeys.subscription(subscriptionId),
    queryFn: async () => {
      const { data, error } = await authClient.subscription.get({
        query: {
          subscriptionId,
          ...(options?.referenceId ? { referenceId: options.referenceId } : {}),
          ...(options?.customerType
            ? { customerType: options.customerType }
            : {}),
        },
      });
      if (error) throw error;
      return data as Subscription;
    },
    enabled: !!subscriptionId,
    ...options?.queryOptions,
  });
}

/**
 * Fetch invoices for a Razorpay subscription.
 *
 * @example
 * ```tsx
 * const { data: invoices } = useRazorpayInvoices(authClient, "sub_rzp_123");
 * ```
 */
export function useRazorpayInvoices(
  authClient: RazorpayAuthClient,
  subscriptionId: string,
  options?: {
    queryOptions?: Omit<
      UseQueryOptions<unknown[], Error>,
      "queryKey" | "queryFn"
    >;
  },
) {
  return useQuery<unknown[], Error>({
    queryKey: razorpayQueryKeys.invoices(subscriptionId),
    queryFn: async () => {
      const { data, error } = await authClient.razorpay.subscription.invoices({
        query: { subscriptionId },
      });
      if (error) throw error;
      return data as unknown[];
    },
    enabled: !!subscriptionId,
    ...options?.queryOptions,
  });
}

/**
 * Fetch a Razorpay subscription by its Razorpay ID (not local DB ID).
 *
 * @example
 * ```tsx
 * const { data } = useRazorpaySubscription(authClient, "sub_rzp_123");
 * ```
 */
export function useRazorpaySubscription(
  authClient: RazorpayAuthClient,
  subscriptionId: string,
  options?: {
    queryOptions?: Omit<UseQueryOptions<unknown, Error>, "queryKey" | "queryFn">;
  },
) {
  return useQuery<unknown, Error>({
    queryKey: razorpayQueryKeys.razorpaySubscription(subscriptionId),
    queryFn: async () => {
      const { data, error } = await authClient.razorpay.subscription.get({
        query: { subscriptionId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!subscriptionId,
    ...options?.queryOptions,
  });
}

/**
 * Fetch all Razorpay plans.
 *
 * @example
 * ```tsx
 * const { data: plans } = useRazorpayPlans(authClient);
 * ```
 */
export function useRazorpayPlans(
  authClient: RazorpayAuthClient,
  options?: {
    queryOptions?: Omit<
      UseQueryOptions<unknown[], Error>,
      "queryKey" | "queryFn"
    >;
  },
) {
  return useQuery<unknown[], Error>({
    queryKey: razorpayQueryKeys.plans(),
    queryFn: async () => {
      const { data, error } = await authClient.razorpay.plan.list({});
      if (error) throw error;
      return data as unknown[];
    },
    ...options?.queryOptions,
  });
}

/**
 * Fetch a pending update for a subscription.
 *
 * @example
 * ```tsx
 * const { data } = useSubscriptionPendingUpdate(authClient, "sub_rzp_123");
 * ```
 */
export function useSubscriptionPendingUpdate(
  authClient: RazorpayAuthClient,
  subscriptionId: string,
  options?: {
    queryOptions?: Omit<UseQueryOptions<unknown, Error>, "queryKey" | "queryFn">;
  },
) {
  return useQuery<unknown, Error>({
    queryKey: razorpayQueryKeys.pendingUpdate(subscriptionId),
    queryFn: async () => {
      const { data, error } =
        await authClient.razorpay.subscription.pendingUpdate({
          query: { subscriptionId },
        });
      if (error) throw error;
      return data;
    },
    enabled: !!subscriptionId,
    ...options?.queryOptions,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

/**
 * Upgrade or create a subscription.
 * Automatically invalidates subscription queries on success.
 *
 * @example
 * ```tsx
 * const upgrade = useUpgradeSubscription(authClient);
 * upgrade.mutate({ plan: "pro", annual: true });
 * ```
 */
export function useUpgradeSubscription(
  authClient: RazorpayAuthClient,
  options?: {
    mutationOptions?: Omit<UseMutationOptions<any, Error, any>, "mutationFn">;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      plan: string;
      referenceId?: string;
      customerType?: "user" | "organization";
      annual?: boolean;
      metadata?: Record<string, unknown>;
      lineItems?: { item_id: string; quantity?: number }[];
      scheduleAtPeriodEnd?: boolean;
    }) => {
      const { data, error } = await authClient.subscription.upgrade(body);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: razorpayQueryKeys.subscriptions(),
      });
    },
    ...options?.mutationOptions,
  });
}

/**
 * Cancel a subscription.
 * Automatically invalidates subscription queries on success.
 *
 * @example
 * ```tsx
 * const cancel = useCancelSubscription(authClient);
 * cancel.mutate({ cancelAtCycleEnd: true });
 * ```
 */
export function useCancelSubscription(
  authClient: RazorpayAuthClient,
  options?: {
    mutationOptions?: Omit<UseMutationOptions<any, Error, any>, "mutationFn">;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      referenceId?: string;
      customerType?: "user" | "organization";
      cancelAtCycleEnd?: boolean;
    }) => {
      const { data, error } = await authClient.subscription.cancel(body);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: razorpayQueryKeys.subscriptions(),
      });
    },
    ...options?.mutationOptions,
  });
}

/**
 * Pause a subscription.
 *
 * @example
 * ```tsx
 * const pause = usePauseSubscription(authClient);
 * pause.mutate({});
 * ```
 */
export function usePauseSubscription(
  authClient: RazorpayAuthClient,
  options?: {
    mutationOptions?: Omit<UseMutationOptions<any, Error, any>, "mutationFn">;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      referenceId?: string;
      customerType?: "user" | "organization";
      pauseAt?: "now";
    }) => {
      const { data, error } = await authClient.subscription.pause(body);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: razorpayQueryKeys.subscriptions(),
      });
    },
    ...options?.mutationOptions,
  });
}

/**
 * Resume a paused subscription.
 *
 * @example
 * ```tsx
 * const resume = useResumeSubscription(authClient);
 * resume.mutate({});
 * ```
 */
export function useResumeSubscription(
  authClient: RazorpayAuthClient,
  options?: {
    mutationOptions?: Omit<UseMutationOptions<any, Error, any>, "mutationFn">;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      referenceId?: string;
      customerType?: "user" | "organization";
      resumeAt?: "now";
    }) => {
      const { data, error } = await authClient.subscription.resume(body);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: razorpayQueryKeys.subscriptions(),
      });
    },
    ...options?.mutationOptions,
  });
}

/**
 * Restore a subscription that was scheduled for cancellation at cycle end.
 *
 * @example
 * ```tsx
 * const restore = useRestoreSubscription(authClient);
 * restore.mutate({});
 * ```
 */
export function useRestoreSubscription(
  authClient: RazorpayAuthClient,
  options?: {
    mutationOptions?: Omit<UseMutationOptions<any, Error, any>, "mutationFn">;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      referenceId?: string;
      customerType?: "user" | "organization";
    }) => {
      const { data, error } = await authClient.subscription.restore(body);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: razorpayQueryKeys.subscriptions(),
      });
    },
    ...options?.mutationOptions,
  });
}

/**
 * Update a subscription (plan change, quantity, metadata, etc).
 *
 * @example
 * ```tsx
 * const update = useUpdateSubscription(authClient);
 * update.mutate({ quantity: 5, metadata: { team: "engineering" } });
 * ```
 */
export function useUpdateSubscription(
  authClient: RazorpayAuthClient,
  options?: {
    mutationOptions?: Omit<UseMutationOptions<any, Error, any>, "mutationFn">;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      referenceId?: string;
      customerType?: "user" | "organization";
      planId?: string;
      quantity?: number;
      remainingCount?: number;
      scheduleChangeAt?: "now" | "cycle_end";
      metadata?: Record<string, unknown>;
      lineItems?: { item_id: string; quantity?: number }[];
    }) => {
      const { data, error } = await authClient.subscription.update(body);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: razorpayQueryKeys.subscriptions(),
      });
    },
    ...options?.mutationOptions,
  });
}

// ─── Status Helpers Hook ─────────────────────────────────────────────────────

/**
 * Derived subscription status helpers.
 * Wraps the subscription data with boolean status flags.
 *
 * @example
 * ```tsx
 * const { isActive, isPaused, isTrialing, canRestore } = useSubscriptionStatus(subscription);
 * ```
 */
export function useSubscriptionStatus(subscription: Subscription | null | undefined) {
  if (!subscription) {
    return {
      isActive: false,
      isAuthenticated: false,
      isPaused: false,
      isCancelled: false,
      isCompleted: false,
      isExpired: false,
      isHalted: false,
      isPending: false,
      isTrialing: false,
      isUsable: false,
      isTerminal: false,
      hasPaymentIssue: false,
      canRestore: false,
    };
  }

  const status = subscription.status;
  const isActive = status === "active";
  const isAuthenticated = status === "authenticated";
  const isPaused = status === "paused";
  const isCancelled = status === "cancelled";
  const isTrialing =
    isAuthenticated &&
    subscription.trialStart !== undefined &&
    subscription.trialStart !== null &&
    (subscription.trialEnd === undefined || subscription.trialEnd === null);

  return {
    isActive,
    isAuthenticated,
    isPaused,
    isCancelled,
    isCompleted: status === "completed",
    isExpired: status === "expired",
    isHalted: status === "halted",
    isPending: status === "pending",
    isTrialing,
    isUsable: isActive || isAuthenticated,
    isTerminal: isCancelled || status === "completed" || status === "expired",
    hasPaymentIssue: status === "pending" || status === "halted",
    canRestore: subscription.cancelAtCycleEnd === true && isActive,
  };
}
