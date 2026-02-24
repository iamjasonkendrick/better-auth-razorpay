import { describe, expect, it } from "vitest";
import { RAZORPAY_ERROR_CODES } from "../error-codes";

describe("RAZORPAY_ERROR_CODES", () => {
  it("is defined", () => {
    expect(RAZORPAY_ERROR_CODES).toBeDefined();
  });

  it("contains all expected error code keys", () => {
    const expectedKeys = [
      "UNAUTHORIZED",
      "INVALID_REQUEST_BODY",
      "SUBSCRIPTION_NOT_FOUND",
      "SUBSCRIPTION_PLAN_NOT_FOUND",
      "ALREADY_SUBSCRIBED_PLAN",
      "REFERENCE_ID_NOT_ALLOWED",
      "CUSTOMER_NOT_FOUND",
      "UNABLE_TO_CREATE_CUSTOMER",
      "WEBHOOK_SIGNATURE_NOT_FOUND",
      "WEBHOOK_SECRET_NOT_FOUND",
      "WEBHOOK_ERROR",
      "FAILED_TO_VERIFY_WEBHOOK",
      "FAILED_TO_FETCH_PLANS",
      "EMAIL_VERIFICATION_REQUIRED",
      "SUBSCRIPTION_NOT_ACTIVE",
      "SUBSCRIPTION_ALREADY_CANCELLED",
      "SUBSCRIPTION_ALREADY_PAUSED",
      "SUBSCRIPTION_NOT_PAUSED",
      "ORGANIZATION_NOT_FOUND",
      "ORGANIZATION_SUBSCRIPTION_NOT_ENABLED",
      "AUTHORIZE_REFERENCE_REQUIRED",
      "ORGANIZATION_HAS_ACTIVE_SUBSCRIPTION",
      "ORGANIZATION_REFERENCE_ID_REQUIRED",
      "PLAN_NOT_FOUND",
      "PLAN_CREATE_FAILED",
      "SUBSCRIPTION_CANCEL_FAILED",
      "SUBSCRIPTION_PAUSE_FAILED",
      "SUBSCRIPTION_RESUME_FAILED",
      "SUBSCRIPTION_UPDATE_FAILED",
      "SUBSCRIPTION_LINK_CREATE_FAILED",
      "INVOICE_FETCH_FAILED",
      "OFFER_LINK_FAILED",
      "OFFER_DELETE_FAILED",
      "CUSTOMER_EDIT_FAILED",
      "PENDING_UPDATE_NOT_FOUND",
      "PENDING_UPDATE_CANCEL_FAILED",
    ];

    for (const key of expectedKeys) {
      expect(RAZORPAY_ERROR_CODES).toHaveProperty(key);
    }
  });

  it("has 36 error codes", () => {
    expect(Object.keys(RAZORPAY_ERROR_CODES).length).toBe(36);
  });

  it("all error codes are non-empty strings", () => {
    for (const [key, value] of Object.entries(RAZORPAY_ERROR_CODES)) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  it("error codes follow SCREAMING_SNAKE_CASE convention", () => {
    for (const key of Object.keys(RAZORPAY_ERROR_CODES)) {
      expect(key).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });
});
