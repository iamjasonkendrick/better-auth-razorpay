'use strict';

const razorpayClient = (options) => {
  return {
    id: "razorpay-client",
    /**
     * This special property helps TypeScript infer the types from the server-side Razorpay plugin.
     * It ensures that when you use `client.subscription.createOrUpdate(...)`, the parameters
     * and return types are correctly checked against what the server expects and provides.
     */
    $InferServerPlugin: {},
    /**
     * Maps the API endpoint paths (defined in `index.ts`) to their HTTP methods.
     * This tells the `better-auth` client how to construct the API requests.
     * These MUST match the paths and methods of the `subscriptionEndpoints` in `index.ts`.
     */
    pathMethods: {
      "/subscription/create-or-update": "POST",
      "/subscription/cancel": "POST",
      "/subscription/restore": "POST",
      "/subscription/list": "GET"
      // The webhook path ("/razorpay/webhook") is typically not called directly by the client,
      // so it's not usually included here.
      // The success callback ("/subscription/success") is a GET redirect, also not a direct client API call.
    }
  };
};

exports.razorpayClient = razorpayClient;
