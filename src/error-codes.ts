import { defineErrorCodes } from "better-auth";

export const RAZORPAY_ERROR_CODES = defineErrorCodes({
  UNAUTHORIZED: "Unauthorized access",
  INVALID_REQUEST_BODY: "Invalid request body",
  SUBSCRIPTION_NOT_FOUND: "Subscription not found",
  SUBSCRIPTION_PLAN_NOT_FOUND: "Subscription plan not found",
  ALREADY_SUBSCRIBED_PLAN: "You're already subscribed to this plan",
  REFERENCE_ID_NOT_ALLOWED: "Reference id is not allowed",
  CUSTOMER_NOT_FOUND: "Razorpay customer not found for this user",
  UNABLE_TO_CREATE_CUSTOMER: "Unable to create Razorpay customer",
  WEBHOOK_SIGNATURE_NOT_FOUND: "Razorpay webhook signature not found",
  WEBHOOK_SECRET_NOT_FOUND: "Razorpay webhook secret not found",
  WEBHOOK_ERROR: "Razorpay webhook error",
  FAILED_TO_VERIFY_WEBHOOK: "Failed to verify Razorpay webhook signature",
  FAILED_TO_FETCH_PLANS: "Failed to fetch plans",
  EMAIL_VERIFICATION_REQUIRED:
    "Email verification is required before you can subscribe to a plan",
  SUBSCRIPTION_NOT_ACTIVE: "Subscription is not active",
  SUBSCRIPTION_ALREADY_CANCELLED: "Subscription is already cancelled",
  SUBSCRIPTION_ALREADY_PAUSED: "Subscription is already paused",
  SUBSCRIPTION_NOT_PAUSED: "Subscription is not paused, cannot resume",
  ORGANIZATION_NOT_FOUND: "Organization not found",
  ORGANIZATION_SUBSCRIPTION_NOT_ENABLED:
    "Organization subscription is not enabled",
  AUTHORIZE_REFERENCE_REQUIRED:
    "Organization subscriptions require authorizeReference callback to be configured",
  ORGANIZATION_HAS_ACTIVE_SUBSCRIPTION:
    "Cannot delete organization with active subscription",
  ORGANIZATION_REFERENCE_ID_REQUIRED:
    "Reference ID is required. Provide referenceId or set activeOrganizationId in session",
  PLAN_NOT_FOUND: "Razorpay plan not found",
  PLAN_CREATE_FAILED: "Failed to create Razorpay plan",
  SUBSCRIPTION_CANCEL_FAILED: "Failed to cancel subscription",
  SUBSCRIPTION_PAUSE_FAILED: "Failed to pause subscription",
  SUBSCRIPTION_RESUME_FAILED: "Failed to resume subscription",
  SUBSCRIPTION_UPDATE_FAILED: "Failed to update subscription",
  SUBSCRIPTION_LINK_CREATE_FAILED: "Failed to create subscription link",
  INVOICE_FETCH_FAILED: "Failed to fetch invoices",
  OFFER_LINK_FAILED: "Failed to link offer to subscription",
  OFFER_DELETE_FAILED: "Failed to delete offer from subscription",
  CUSTOMER_EDIT_FAILED: "Failed to edit customer details",
  PENDING_UPDATE_NOT_FOUND: "No pending update found for subscription",
  PENDING_UPDATE_CANCEL_FAILED: "Failed to cancel pending update",
});
