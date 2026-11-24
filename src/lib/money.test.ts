import { describe, expect, it } from "vitest";
import { commissionMinor, sellerPayoutMinor, formatMoney } from "./money";

describe("money", () => {
  it("computes commission in basis points", () => {
    expect(commissionMinor(10_000, 800)).toBe(800);
    expect(commissionMinor(0, 800)).toBe(0);
  });

  it("rounds to a whole minor unit", () => {
    expect(commissionMinor(1_999, 800)).toBe(160); // 159.92 -> 160
  });

  it("commission + payout always equals the subtotal", () => {
    for (const subtotal of [1, 99, 1_999, 123_457, 9_999_999]) {
      expect(commissionMinor(subtotal, 800) + sellerPayoutMinor(subtotal, 800)).toBe(subtotal);
    }
  });

  it("rejects non-integer or negative subtotals", () => {
    expect(() => commissionMinor(10.5)).toThrow(RangeError);
    expect(() => commissionMinor(-1)).toThrow(RangeError);
  });

  it("formats minor units as currency", () => {
    expect(formatMoney(129_900, "USD")).toBe("$1,299.00");
  });
});
