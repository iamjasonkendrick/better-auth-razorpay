import { defu } from "defu";

/**
 * Razorpay uses `notes` (key-value pairs, max 15) instead of Stripe's `metadata`.
 */
type RazorpayNotes = Record<string, string>;

/**
 * Internal notes fields for Razorpay Customer.
 */
type CustomerInternalNotes =
  | { customerType: "user"; userId: string }
  | { customerType: "organization"; organizationId: string };

/**
 * Internal notes fields for Razorpay Subscription.
 */
type SubscriptionInternalNotes = {
  userId: string;
  subscriptionId: string;
  referenceId: string;
};

/**
 * Customer notes - set internal fields and extract typed fields.
 */
export const customerNotes = {
  /**
   * Internal notes keys for type-safe access.
   */
  keys: {
    userId: "userId",
    organizationId: "organizationId",
    customerType: "customerType",
  } as const,

  /**
   * Create notes with internal fields that cannot be overridden by user notes.
   * Uses `defu` which prioritizes the first argument.
   */
  set(
    internalFields: CustomerInternalNotes,
    ...userNotes: (RazorpayNotes | undefined)[]
  ): RazorpayNotes {
    return defu(internalFields, ...userNotes.filter(Boolean)) as RazorpayNotes;
  },

  /**
   * Extract internal fields from Razorpay notes.
   * Provides type-safe access to internal notes keys.
   */
  get(notes: RazorpayNotes | string[] | null | undefined) {
    if (!notes || Array.isArray(notes)) {
      return {
        userId: undefined,
        organizationId: undefined,
        customerType: undefined as
          | CustomerInternalNotes["customerType"]
          | undefined,
      };
    }
    return {
      userId: notes.userId,
      organizationId: notes.organizationId,
      customerType: notes.customerType as
        | CustomerInternalNotes["customerType"]
        | undefined,
    };
  },
};

/**
 * Subscription notes - set internal fields and extract typed fields.
 */
export const subscriptionNotes = {
  /**
   * Internal notes keys for type-safe access.
   */
  keys: {
    userId: "userId",
    subscriptionId: "subscriptionId",
    referenceId: "referenceId",
  } as const,

  /**
   * Create notes with internal fields that cannot be overridden by user notes.
   * Uses `defu` which prioritizes the first argument.
   */
  set(
    internalFields: SubscriptionInternalNotes,
    ...userNotes: (RazorpayNotes | undefined)[]
  ): RazorpayNotes {
    return defu(internalFields, ...userNotes.filter(Boolean)) as RazorpayNotes;
  },

  /**
   * Extract internal fields from Razorpay notes.
   * Provides type-safe access to internal notes keys.
   */
  get(notes: RazorpayNotes | string[] | null | undefined) {
    if (!notes || Array.isArray(notes)) {
      return {
        userId: undefined,
        subscriptionId: undefined,
        referenceId: undefined,
      };
    }
    return {
      userId: notes.userId,
      subscriptionId: notes.subscriptionId,
      referenceId: notes.referenceId,
    };
  },
};
