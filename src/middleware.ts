import { createAuthMiddleware } from "@better-auth/core/api";
import { sessionMiddleware } from "better-auth/api";
import { RAZORPAY_ERROR_CODES } from "./error-codes";
import type {
  AuthorizeReferenceAction,
  CustomerType,
  RazorpayCtxSession,
  SubscriptionOptions,
} from "./types";
import { createAPIError } from "./utils";

export const razorpaySessionMiddleware = createAuthMiddleware(
  {
    use: [sessionMiddleware],
  },
  async (ctx) => {
    const session = ctx.context.session as RazorpayCtxSession;
    return {
      session,
    };
  },
);

export const referenceMiddleware = (
  subscriptionOptions: SubscriptionOptions,
  action: AuthorizeReferenceAction,
) =>
  createAuthMiddleware(async (ctx) => {
    const ctxSession = ctx.context.session as RazorpayCtxSession;
    if (!ctxSession) {
      throw createAPIError("UNAUTHORIZED", RAZORPAY_ERROR_CODES.UNAUTHORIZED);
    }

    const customerType: CustomerType =
      ctx.body?.customerType || ctx.query?.customerType;
    const explicitReferenceId = ctx.body?.referenceId || ctx.query?.referenceId;

    if (customerType === "organization") {
      // Organization subscriptions always require authorizeReference
      if (!subscriptionOptions.authorizeReference) {
        ctx.context.logger.error(
          `Organization subscriptions require authorizeReference to be defined in your razorpay plugin config.`,
        );
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.AUTHORIZE_REFERENCE_REQUIRED,
        );
      }

      const referenceId =
        explicitReferenceId || ctxSession.session.activeOrganizationId;
      if (!referenceId) {
        throw createAPIError(
          "BAD_REQUEST",
          RAZORPAY_ERROR_CODES.ORGANIZATION_REFERENCE_ID_REQUIRED,
        );
      }
      const isAuthorized = await subscriptionOptions.authorizeReference(
        {
          user: ctxSession.user,
          session: ctxSession.session,
          referenceId,
          action,
        },
        ctx,
      );
      if (!isAuthorized) {
        throw createAPIError("UNAUTHORIZED", RAZORPAY_ERROR_CODES.UNAUTHORIZED);
      }
      return;
    }

    // User subscriptions - pass if no explicit referenceId
    if (!explicitReferenceId) {
      return;
    }

    // Pass if referenceId is user id
    if (explicitReferenceId === ctxSession.user.id) {
      return;
    }

    if (!subscriptionOptions.authorizeReference) {
      ctx.context.logger.error(
        `Passing referenceId into a subscription action isn't allowed if subscription.authorizeReference isn't defined in your razorpay plugin config.`,
      );
      throw createAPIError(
        "BAD_REQUEST",
        RAZORPAY_ERROR_CODES.REFERENCE_ID_NOT_ALLOWED,
      );
    }
    const isAuthorized = await subscriptionOptions.authorizeReference(
      {
        user: ctxSession.user,
        session: ctxSession.session,
        referenceId: explicitReferenceId,
        action,
      },
      ctx,
    );
    if (!isAuthorized) {
      throw createAPIError("UNAUTHORIZED", RAZORPAY_ERROR_CODES.UNAUTHORIZED);
    }
  });
