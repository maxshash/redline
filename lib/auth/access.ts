import { safeNextPath } from "./safe-redirect";

/** Every route under these prefixes needs a signed-in person. */
export const PROTECTED_PREFIXES = ["/library", "/red-lines"] as const;

/** Pages that only make sense for someone who is signed out. */
const SIGNED_OUT_PAGES = ["/sign-in", "/sign-up"] as const;

export const SIGN_IN_PATH = "/sign-in";

function matchesSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesSegment(pathname, prefix));
}

/** "/sign-in?next=<path>", with the path and its query string encoded. */
export function signInPathFor(pathWithSearch: string): string {
  return `${SIGN_IN_PATH}?next=${encodeURIComponent(pathWithSearch)}`;
}

export type AccessDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: string };

export interface AccessRequest {
  pathname: string;
  /** The raw query string including "?", or "". */
  search?: string;
  signedIn: boolean;
}

/**
 * The single access rule, shared by the proxy and the signed-in layout.
 *
 * - Signed out on a protected path: go to sign-in, remembering where they were.
 * - Signed in on sign-in or sign-up: go to their `next`, or the library.
 * - Everything else: allow.
 */
export function decideAccess({ pathname, search = "", signedIn }: AccessRequest): AccessDecision {
  if (!signedIn && isProtectedPath(pathname)) {
    return { kind: "redirect", to: signInPathFor(`${pathname}${search}`) };
  }

  if (signedIn && SIGNED_OUT_PAGES.some((page) => matchesSegment(pathname, page))) {
    const next = new URLSearchParams(search).get("next");
    return { kind: "redirect", to: safeNextPath(next) };
  }

  return { kind: "allow" };
}
