import type { BetterAuthClientPlugin } from "better-auth";
import type { razorpay } from "./index"; // Imports the server-side plugin type for inference

export const razorpayClient = <
  // This generic O allows the client to be aware of whether subscription features are enabled.
  O extends {
    subscription: boolean;
  }
>(
  options?: O // options here is for potential client-side configurations, though not used in this basic version
) => {
  return {
    id: "razorpay-client",
    /**
     * This special property helps TypeScript infer the types from the server-side Razorpay plugin.
     * It ensures that when you use `client.subscription.createOrUpdate(...)`, the parameters
     * and return types are correctly checked against what the server expects and provides.
     */
    $InferServerPlugin: {} as ReturnType<
      typeof razorpay<
        // Inferring from our main 'razorpay' server plugin
        O["subscription"] extends true
          ? {
              // If subscription is true, infer with subscription options
              razorpayClient: any; // These are server-side, so 'any' is fine for client inference
              razorpayWebhookSecret: string;
              subscription: {
                enabled: true;
                plans: []; // Actual plan structure isn't needed for client-side type inference here
                // Include other subscription options if they affect client-callable endpoints or their types
              };
              // Include other top-level RazorpayOptions if they affect client-callable endpoints
            }
          : {
              // If subscription is false, infer without subscription options
              razorpayClient: any;
              razorpayWebhookSecret: string;
              // No subscription object if not enabled
            }
      >
    >,
    /**
     * Maps the API endpoint paths (defined in `index.ts`) to their HTTP methods.
     * This tells the `better-auth` client how to construct the API requests.
     * These MUST match the paths and methods of the `subscriptionEndpoints` in `index.ts`.
     */
    pathMethods: {
      "/subscription/create-or-update": "POST",
      "/subscription/cancel": "POST",
      "/subscription/restore": "POST",
      "/subscription/list": "GET",
      // The webhook path ("/razorpay/webhook") is typically not called directly by the client,
      // so it's not usually included here.
      // The success callback ("/subscription/success") is a GET redirect, also not a direct client API call.
    },
  } satisfies BetterAuthClientPlugin; // Ensures this object conforms to the BetterAuthClientPlugin interface
};
