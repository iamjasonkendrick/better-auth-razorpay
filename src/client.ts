import type { BetterAuthClientPlugin } from "better-auth/client";
import type { razorpay } from "./index";
import type { RazorpayPlan } from "./types";
export const razorpayClient = <
  O extends {
    subscription: boolean;
  },
>(
  options?: O | undefined,
) => {
  return {
    id: "razorpay-client",
    $InferServerPlugin: {} as ReturnType<
      typeof razorpay<
        O["subscription"] extends true
          ? {
              razorpayClient: any;
              razorpayWebhookSecret: string;
              subscription: {
                enabled: true;
                plans: RazorpayPlan[];
              };
            }
          : {
              razorpayClient: any;
              razorpayWebhookSecret: string;
            }
      >
    >,
    pathMethods: {
      "/subscription/pause": "POST",
      "/subscription/resume": "POST",
      "/subscription/update": "POST",
      "/razorpay/subscription/get": "GET",
      "/razorpay/subscription-link": "POST",
      "/razorpay/subscription/pending-update": "GET",
      "/razorpay/subscription/cancel-update": "POST",
      "/razorpay/subscription/invoices": "GET",
      "/razorpay/subscription/link-offer": "POST",
      "/razorpay/subscription/delete-offer": "POST",
      "/razorpay/plan/create": "POST",
      "/razorpay/plan/list": "GET",
      "/razorpay/plan/get": "GET",
      "/razorpay/customer/create": "POST",
      "/razorpay/customer/edit": "POST",
      "/razorpay/customer/list": "GET",
      "/razorpay/customer/get": "GET",
    },
  } satisfies BetterAuthClientPlugin;
};
export * from "./error-codes";
