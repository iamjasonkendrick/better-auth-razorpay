import { APIError } from "better-call";
import { describe, expect, it, vi } from "vitest";
import type { RazorpayOptions, RazorpayPlan } from "../types";
import {
  createAPIError,
  getPlanByName,
  getPlanByPlanId,
  getPlans,
  hasPaymentIssue,
  isActive,
  isAuthenticated,
  isCancelled,
  isPaused,
  isTerminal,
  isUsable,
  timestampToDate,
  toSubscriptionStatus,
} from "../utils";

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockPlans: RazorpayPlan[] = [
  { planId: "plan_001", name: "Basic", annualPlanId: "plan_001_annual" },
  { planId: "plan_002", name: "Pro" },
  { planId: "plan_003", name: "Enterprise", annualPlanId: "plan_003_annual" },
];

function makeOptions(
  overrides?: Partial<RazorpayOptions["subscription"]>,
): RazorpayOptions {
  return {
    razorpayClient: {} as any,
    razorpayWebhookSecret: "secret",
    subscription: {
      enabled: true,
      plans: mockPlans,
      ...overrides,
    },
  } as RazorpayOptions;
}

// ─── createAPIError ──────────────────────────────────────────────────────────

describe("createAPIError", () => {
  it("returns an APIError instance", () => {
    const err = createAPIError("BAD_REQUEST", "Something went wrong");
    expect(err).toBeInstanceOf(APIError);
  });

  it("sets correct status", () => {
    const err = createAPIError("NOT_FOUND", "Not found");
    expect(err.status).toBe("NOT_FOUND");
  });

  it("sets body with message and code", () => {
    const err = createAPIError("UNAUTHORIZED", "No access");
    expect(err.body).toMatchObject({
      body: { message: "No access", code: "No access" },
    });
  });
});

// ─── getPlans ────────────────────────────────────────────────────────────────

describe("getPlans", () => {
  it("returns static plan array", async () => {
    const plans = await getPlans({
      enabled: true,
      plans: mockPlans,
    } as any);
    expect(plans).toEqual(mockPlans);
  });

  it("calls and returns from async function", async () => {
    const plansFn = vi.fn().mockResolvedValue(mockPlans);
    const plans = await getPlans({
      enabled: true,
      plans: plansFn,
    } as any);
    expect(plansFn).toHaveBeenCalledOnce();
    expect(plans).toEqual(mockPlans);
  });

  it("throws when subscriptions are not enabled", async () => {
    await expect(getPlans({ enabled: false } as any)).rejects.toThrow(
      "Subscriptions are not enabled",
    );
  });

  it("throws when subscription options are undefined", async () => {
    await expect(getPlans(undefined)).rejects.toThrow(
      "Subscriptions are not enabled",
    );
  });
});

// ─── getPlanByName ───────────────────────────────────────────────────────────

describe("getPlanByName", () => {
  it("finds plan by exact name", async () => {
    const plan = await getPlanByName(makeOptions(), "basic");
    expect(plan?.planId).toBe("plan_001");
  });

  it("is case-insensitive", async () => {
    const plan = await getPlanByName(makeOptions(), "ENTERPRISE");
    expect(plan?.planId).toBe("plan_003");
  });

  it("returns undefined for non-existent plan", async () => {
    const plan = await getPlanByName(makeOptions(), "nonexistent");
    expect(plan).toBeUndefined();
  });
});

// ─── getPlanByPlanId ─────────────────────────────────────────────────────────

describe("getPlanByPlanId", () => {
  it("matches by planId", async () => {
    const plan = await getPlanByPlanId(makeOptions(), "plan_002");
    expect(plan?.name).toBe("Pro");
  });

  it("matches by annualPlanId", async () => {
    const plan = await getPlanByPlanId(makeOptions(), "plan_001_annual");
    expect(plan?.name).toBe("Basic");
  });

  it("returns undefined for non-existent plan ID", async () => {
    const plan = await getPlanByPlanId(makeOptions(), "plan_999");
    expect(plan).toBeUndefined();
  });
});

// ─── Status Checkers ─────────────────────────────────────────────────────────

const ALL_STATUSES = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "cancelled",
  "completed",
  "expired",
  "paused",
] as const;

describe("isActive", () => {
  it.each(ALL_STATUSES)("status '%s' → %s", (status) => {
    expect(isActive({ status })).toBe(status === "active");
  });
});

describe("isAuthenticated", () => {
  it.each(ALL_STATUSES)("status '%s'", (status) => {
    expect(isAuthenticated({ status })).toBe(status === "authenticated");
  });
});

describe("isPaused", () => {
  it.each(ALL_STATUSES)("status '%s'", (status) => {
    expect(isPaused({ status })).toBe(status === "paused");
  });
});

describe("isCancelled", () => {
  it.each(ALL_STATUSES)("status '%s'", (status) => {
    expect(isCancelled({ status })).toBe(status === "cancelled");
  });
});

describe("isTerminal", () => {
  it.each(ALL_STATUSES)("status '%s'", (status) => {
    const expected = ["cancelled", "completed", "expired"].includes(status);
    expect(isTerminal({ status })).toBe(expected);
  });
});

describe("isUsable", () => {
  it.each(ALL_STATUSES)("status '%s'", (status) => {
    const expected = ["active", "authenticated"].includes(status);
    expect(isUsable({ status })).toBe(expected);
  });
});

describe("hasPaymentIssue", () => {
  it.each(ALL_STATUSES)("status '%s'", (status) => {
    const expected = ["pending", "halted"].includes(status);
    expect(hasPaymentIssue({ status })).toBe(expected);
  });
});

// ─── timestampToDate ─────────────────────────────────────────────────────────

describe("timestampToDate", () => {
  it("converts unix timestamp (seconds) to Date", () => {
    const date = timestampToDate(1700000000);
    expect(date).toBeInstanceOf(Date);
    expect(date!.getTime()).toBe(1700000000 * 1000);
  });

  it("returns undefined for null", () => {
    expect(timestampToDate(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(timestampToDate(undefined)).toBeUndefined();
  });

  it("returns undefined for 0", () => {
    expect(timestampToDate(0)).toBeUndefined();
  });
});

// ─── toSubscriptionStatus ────────────────────────────────────────────────────

describe("toSubscriptionStatus", () => {
  it.each(ALL_STATUSES)("returns '%s' for valid status", (status) => {
    expect(toSubscriptionStatus(status)).toBe(status);
  });

  it("falls back to 'created' for unknown status", () => {
    expect(toSubscriptionStatus("unknown")).toBe("created");
  });

  it("falls back to 'created' for empty string", () => {
    expect(toSubscriptionStatus("")).toBe("created");
  });
});
