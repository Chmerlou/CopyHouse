import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./routes";

describe("safeReturnTo", () => {
  it("keeps a local application path", () => {
    expect(safeReturnTo("/upload")).toBe("/upload");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeReturnTo("https://example.com")).toBe("/upload");
    expect(safeReturnTo("//example.com")).toBe("/upload");
  });
});
