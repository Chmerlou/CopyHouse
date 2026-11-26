import { describe, expect, it } from "vitest";
import { priceInput, readPrice } from "./price";

describe("print point prices", () => {
  it.each([["12", 1200], [" 12,3 ", 1230], ["1.01", 101], ["0,01", 1], ["21474836,47", 2147483647]])(
    "converts %s to exact kopecks", (input, expected) => {
      expect(readPrice(input)).toBe(expected);
      expect(readPrice(priceInput(expected))).toBe(expected);
    },
  );

  it.each([null, "", "0", "-2", "4,001", "4e2", "21474836,48"])("rejects %s", (input) => {
    expect(readPrice(input)).toBeNull();
  });
});
