import { describe, expect, it } from "vitest";
import { customerNotes, subscriptionNotes } from "../metadata";

// ─── customerNotes ───────────────────────────────────────────────────────────

describe("customerNotes", () => {
  describe("keys", () => {
    it("has expected key constants", () => {
      expect(customerNotes.keys).toEqual({
        userId: "userId",
        organizationId: "organizationId",
        customerType: "customerType",
      });
    });
  });

  describe("set", () => {
    it("sets user-type internal fields", () => {
      const notes = customerNotes.set({
        customerType: "user",
        userId: "user_123",
      });
      expect(notes.customerType).toBe("user");
      expect(notes.userId).toBe("user_123");
    });

    it("sets organization-type internal fields", () => {
      const notes = customerNotes.set({
        customerType: "organization",
        organizationId: "org_456",
      });
      expect(notes.customerType).toBe("organization");
      expect(notes.organizationId).toBe("org_456");
    });

    it("merges user notes", () => {
      const notes = customerNotes.set(
        { customerType: "user", userId: "user_123" },
        { custom: "value" },
      );
      expect(notes.custom).toBe("value");
      expect(notes.userId).toBe("user_123");
    });

    it("internal fields take priority over user notes", () => {
      const notes = customerNotes.set(
        { customerType: "user", userId: "user_123" },
        { userId: "hacked", customerType: "organization" },
      );
      expect(notes.userId).toBe("user_123");
      expect(notes.customerType).toBe("user");
    });

    it("handles undefined user notes", () => {
      const notes = customerNotes.set(
        { customerType: "user", userId: "user_123" },
        undefined,
      );
      expect(notes.userId).toBe("user_123");
    });
  });

  describe("get", () => {
    it("extracts internal fields from notes", () => {
      const result = customerNotes.get({
        userId: "user_123",
        customerType: "user",
        custom: "value",
      });
      expect(result.userId).toBe("user_123");
      expect(result.customerType).toBe("user");
    });

    it("returns undefined fields for null input", () => {
      const result = customerNotes.get(null);
      expect(result.userId).toBeUndefined();
      expect(result.organizationId).toBeUndefined();
      expect(result.customerType).toBeUndefined();
    });

    it("returns undefined fields for undefined input", () => {
      const result = customerNotes.get(undefined);
      expect(result.userId).toBeUndefined();
    });

    it("returns undefined fields for array input", () => {
      const result = customerNotes.get(["some", "values"]);
      expect(result.userId).toBeUndefined();
    });
  });
});

// ─── subscriptionNotes ───────────────────────────────────────────────────────

describe("subscriptionNotes", () => {
  describe("keys", () => {
    it("has expected key constants", () => {
      expect(subscriptionNotes.keys).toEqual({
        userId: "userId",
        subscriptionId: "subscriptionId",
        referenceId: "referenceId",
      });
    });
  });

  describe("set", () => {
    it("sets internal fields", () => {
      const notes = subscriptionNotes.set({
        userId: "user_123",
        subscriptionId: "sub_456",
        referenceId: "ref_789",
      });
      expect(notes.userId).toBe("user_123");
      expect(notes.subscriptionId).toBe("sub_456");
      expect(notes.referenceId).toBe("ref_789");
    });

    it("merges user notes", () => {
      const notes = subscriptionNotes.set(
        { userId: "u1", subscriptionId: "s1", referenceId: "r1" },
        { plan: "pro" },
      );
      expect(notes.plan).toBe("pro");
      expect(notes.userId).toBe("u1");
    });

    it("internal fields take priority", () => {
      const notes = subscriptionNotes.set(
        { userId: "real", subscriptionId: "s1", referenceId: "r1" },
        { userId: "fake" },
      );
      expect(notes.userId).toBe("real");
    });
  });

  describe("get", () => {
    it("extracts internal fields from notes", () => {
      const result = subscriptionNotes.get({
        userId: "u1",
        subscriptionId: "s1",
        referenceId: "r1",
        extra: "data",
      });
      expect(result.userId).toBe("u1");
      expect(result.subscriptionId).toBe("s1");
      expect(result.referenceId).toBe("r1");
    });

    it("returns undefined fields for null input", () => {
      const result = subscriptionNotes.get(null);
      expect(result.userId).toBeUndefined();
      expect(result.subscriptionId).toBeUndefined();
      expect(result.referenceId).toBeUndefined();
    });

    it("returns undefined fields for array input", () => {
      const result = subscriptionNotes.get(["a", "b"]);
      expect(result.userId).toBeUndefined();
    });
  });
});
