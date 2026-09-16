import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-redirect";

describe("safeNextPath", () => {
  it.each([
    ["/library", "/library"],
    ["/library/abc", "/library/abc"],
    ["/red-lines?tab=mine", "/red-lines?tab=mine"],
    ["/library/abc#flag-3", "/library/abc#flag-3"],
    ["/analyze", "/analyze"],
  ])("accepts the relative path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "//evil.com",
    "//evil.com/library",
    "https://evil.com",
    "http://evil.com/library",
    "javascript:alert(1)",
    "/\\evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "library",
    "evil.com",
    "",
  ])("rejects %j and falls back to /library", (input) => {
    expect(safeNextPath(input)).toBe("/library");
  });

  it("rejects non-string values", () => {
    expect(safeNextPath(null)).toBe("/library");
    expect(safeNextPath(undefined)).toBe("/library");
    expect(safeNextPath(["/library/abc"])).toBe("/library");
  });

  it("refuses auth pages so sign-in can't loop back to itself", () => {
    expect(safeNextPath("/sign-in")).toBe("/library");
    expect(safeNextPath("/sign-up?next=/library")).toBe("/library");
    expect(safeNextPath("/auth/confirm")).toBe("/library");
    expect(safeNextPath("/sign-inside")).toBe("/sign-inside");
  });

  it("uses the fallback it is given", () => {
    expect(safeNextPath("//evil.com", "/")).toBe("/");
  });
});
