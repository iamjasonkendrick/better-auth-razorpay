import type { RazorpayOptions } from "./types";

/**
 * A helper function to get plans, whether they are provided as a static array
 * or an async function.
 * @param options - The plugin options.
 * @returns A promise that resolves to the array of plans.
 */
export async function getPlans(options: RazorpayOptions) {
  if (!options.subscription?.plans) {
    return [];
  }
  return typeof options.subscription.plans === "function"
    ? await options.subscription.plans()
    : options.subscription.plans;
}

/**
 * Finds a plan configuration by its unique name (e.g., "Pro").
 * @param options - The plugin options.
 * @param name - The name of the plan.
 * @returns A promise that resolves to the plan object or undefined.
 */
export async function getPlanByName(options: RazorpayOptions, name: string) {
  return await getPlans(options).then((res) =>
    res?.find((plan) => plan.name.toLowerCase() === name.toLowerCase())
  );
}

/**
 * Finds a plan configuration by its official Razorpay Plan ID, checking both
 * monthly and annual plan IDs.
 * @param options - The plugin options.
 * @param razorpayPlanId - The Razorpay Plan ID (e.g., "plan_xxxxxxxxxxxxxx").
 * @returns A promise that resolves to the plan object or undefined.
 */
export async function getPlanByRazorpayId(
  options: RazorpayOptions,
  razorpayPlanId: string
) {
  return await getPlans(options).then((res) =>
    res?.find(
      (plan) =>
        plan.monthlyPlanId === razorpayPlanId ||
        plan.annualPlanId === razorpayPlanId
    )
  );
}
