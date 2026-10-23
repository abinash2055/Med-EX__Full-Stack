import { describe, expect, it } from "vitest";
import {
  fromSatang,
  roundHalfUp,
  toSatang,
} from "../src/money";

describe("Money calculations", () => {
  it("converts baht to integer satang", () => {
    expect(toSatang("0.10")).toBe(10);
    expect(toSatang("333.33")).toBe(33333);
    expect(toSatang("3450.50")).toBe(345050);
  });

  it("formats satang as two-decimal strings", () => {
    expect(fromSatang(10)).toBe("0.10");
    expect(fromSatang(345050)).toBe("3450.50");
  });

  it("rounds half up", () => {
    expect(roundHalfUp(125, 1000)).toBe(0);
    expect(roundHalfUp(1, 2)).toBe(1);
    expect(roundHalfUp(5, 2)).toBe(3);
  });
});