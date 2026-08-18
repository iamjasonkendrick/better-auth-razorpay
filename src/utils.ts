import * as crypto from "node:crypto";
import { APIError } from "better-auth";
import type {
  RazorpayOptions,
  RazorpaySubscriptionStatus,
  Subscription,
} from "./types";

/**
 * Create an APIError using Better Auth's native error-code descriptor shape so
 * server responses and client-side `error.message`/`error.code` stay useful.
 */
export function createAPIError(
  status: ConstructorParameters<typeof APIError>[0],
  error: string | { code: string; message: string },
): APIError {
  const body =
    typeof error === "string"
      ? {
          code: error.toUpperCase().replace(/ /g, "_"),
          message: error,
        }
      : error;
  return new APIError(status, body);
}

export async function getPlans(
  subscriptionOptions: RazorpayOptions["subscription"],
) {
  if (subscriptionOptions?.enabled) {
    return typeof subscriptionOptions.plans === "function"
      ? await subscriptionOptions.plans()
      : subscriptionOptions.plans;
  }
  throw new Error("Subscriptions are not enabled in the Razorpay options.");
}

/**
 * Verify a Razorpay webhook signature without allowing malformed input to
 * reach crypto.timingSafeEqual with mismatched buffer lengths.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  return (
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  );
}

/**
 * Resolve the Razorpay customer for the billing entity represented by a
 * subscription request. Organization billing reads from the organization
 * record rather than from the authenticated user's customer ID.
 */
export async function getPlanByName(options: RazorpayOptions, name: string) {
  return await getPlans(options.subscription).then((res) =>
    res?.find((plan) => plan.name.toLowerCase() === name.toLowerCase()),
  );
}

/**
 * Find a plan by its Razorpay plan ID
 */
export async function getPlanByPlanId(
  options: RazorpayOptions,
  planId: string,
) {
  return await getPlans(options.subscription).then((res) =>
    res?.find((plan) => plan.planId === planId || plan.annualPlanId === planId),
  );
}

/**
 * Checks if a subscription is in an active state
 */
export function isActive(sub: Subscription | { status: string }): boolean {
  return sub.status === "active";
}

/**
 * Checks if a subscription is authenticated (authorized but not yet charged)
 */
export function isAuthenticated(
  sub: Subscription | { status: string },
): boolean {
  return sub.status === "authenticated";
}

/**
 * Checks if a subscription is paused
 */
export function isPaused(sub: Subscription | { status: string }): boolean {
  return sub.status === "paused";
}

/**
 * Checks if a subscription is cancelled
 */
export function isCancelled(sub: Subscription | { status: string }): boolean {
  return sub.status === "cancelled";
}

/**
 * Checks if a subscription is in a terminal state
 * (cancelled, completed, or expired)
 */
export function isTerminal(sub: Subscription | { status: string }): boolean {
  return (
    sub.status === "cancelled" ||
    sub.status === "completed" ||
    sub.status === "expired"
  );
}

/**
 * Checks if a subscription is in a state where it can be used
 * (active or authenticated)
 */
export function isUsable(sub: Subscription | { status: string }): boolean {
  return sub.status === "active" || sub.status === "authenticated";
}

/**
 * Checks if a subscription has payment issues
 * (pending or halted)
 */
export function hasPaymentIssue(
  sub: Subscription | { status: string },
): boolean {
  return sub.status === "pending" || sub.status === "halted";
}

/**
 * Convert a Unix timestamp (seconds) to a Date, or return undefined
 */
export function timestampToDate(
  timestamp: number | null | undefined,
): Date | undefined {
  return timestamp ? new Date(timestamp * 1000) : undefined;
}

/**
 * Convert a Razorpay subscription status string to our typed status
 */
export function toSubscriptionStatus(
  status: string,
): RazorpaySubscriptionStatus {
  const validStatuses: RazorpaySubscriptionStatus[] = [
    "created",
    "authenticated",
    "active",
    "pending",
    "halted",
    "cancelled",
    "completed",
    "expired",
    "paused",
  ];
  if (validStatuses.includes(status as RazorpaySubscriptionStatus)) {
    return status as RazorpaySubscriptionStatus;
  }
  return "created";
}
