import { describe, expect, it } from "vitest";
import { decideAccess, isProtectedPath, signInPathFor } from "@/lib/auth/access";

describe("isProtectedPath", () => {
  it.each(["/library", "/library/", "/library/abc", "/library/abc/def", "/red-lines", "/red-lines/new"])(
    "protects %s",
    (path) => {
      expect(isProtectedPath(path)).toBe(true);
    },
  );

  it.each(["/", "/analyze", "/sign-in", "/sign-up", "/auth/confirm", "/libraryx", "/library-old", "/red-linesx", "/red", "/Library"])(
    "leaves %s public",
    (path) => {
      expect(isProtectedPath(path)).toBe(false);
    },
  );
});

describe("decideAccess", () => {
  it("sends a signed-out visitor on /library to sign-in with next", () => {
    expect(decideAccess({ pathname: "/library", signedIn: false })).toEqual({
      kind: "redirect",
      to: "/sign-in?next=%2Flibrary",
    });
  });

  it("keeps nested paths and the query string in next", () => {
    const decision = decideAccess({ pathname: "/red-lines/abc", search: "?tab=2&x=y", signedIn: false });
    expect(decision).toEqual({ kind: "redirect", to: "/sign-in?next=%2Fred-lines%2Fabc%3Ftab%3D2%26x%3Dy" });
    const next = new URL(`http://x${(decision as { to: string }).to}`).searchParams.get("next");
    expect(next).toBe("/red-lines/abc?tab=2&x=y");
  });

  it("does not redirect a lookalike path", () => {
    expect(decideAccess({ pathname: "/libraryx", signedIn: false })).toEqual({ kind: "allow" });
  });

  it("allows public pages when signed out", () => {
    for (const pathname of ["/", "/analyze", "/sign-in", "/sign-up"]) {
      expect(decideAccess({ pathname, signedIn: false })).toEqual({ kind: "allow" });
    }
  });

  it("allows protected pages when signed in", () => {
    expect(decideAccess({ pathname: "/library/abc", signedIn: true })).toEqual({ kind: "allow" });
    expect(decideAccess({ pathname: "/red-lines", signedIn: true })).toEqual({ kind: "allow" });
  });

  it("sends a signed-in person away from sign-in to a safe next", () => {
    expect(decideAccess({ pathname: "/sign-in", search: "?next=%2Fred-lines", signedIn: true })).toEqual({
      kind: "redirect",
      to: "/red-lines",
    });
  });

  it("ignores an unsafe or looping next when a signed-in person hits sign-up", () => {
    expect(decideAccess({ pathname: "/sign-up", search: "?next=%2F%2Fevil.com", signedIn: true })).toEqual({
      kind: "redirect",
      to: "/library",
    });
    expect(decideAccess({ pathname: "/sign-in", search: "?next=%2Fsign-in", signedIn: true })).toEqual({
      kind: "redirect",
      to: "/library",
    });
  });
});

describe("signInPathFor", () => {
  it("encodes the path so its own query string survives", () => {
    expect(signInPathFor("/library?a=1&b=2")).toBe("/sign-in?next=%2Flibrary%3Fa%3D1%26b%3D2");
  });
});
