import { razorpay } from './index.js';
import 'better-auth';
import 'razorpay/dist/types/api';
import 'razorpay/dist/types/subscriptions';
import 'better-call';
import 'better-auth/api';
import 'zod';
import 'razorpay';
import 'razorpay/dist/types/customers';

declare const razorpayClient: <O extends {
    subscription: boolean;
}>(options?: O) => {
    id: "razorpay-client";
    /**
     * This special property helps TypeScript infer the types from the server-side Razorpay plugin.
     * It ensures that when you use `client.subscription.createOrUpdate(...)`, the parameters
     * and return types are correctly checked against what the server expects and provides.
     */
    $InferServerPlugin: ReturnType<typeof razorpay<O["subscription"] extends true ? {
        razorpayClient: any;
        razorpayWebhookSecret: string;
        subscription: {
            enabled: true;
            plans: [];
        };
    } : {
        razorpayClient: any;
        razorpayWebhookSecret: string;
    }>>;
    /**
     * Maps the API endpoint paths (defined in `index.ts`) to their HTTP methods.
     * This tells the `better-auth` client how to construct the API requests.
     * These MUST match the paths and methods of the `subscriptionEndpoints` in `index.ts`.
     */
    pathMethods: {
        "/subscription/create-or-update": "POST";
        "/subscription/cancel": "POST";
        "/subscription/restore": "POST";
        "/subscription/list": "GET";
    };
};

export { razorpayClient };
