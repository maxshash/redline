/** Where a signed-in person goes when there is no usable `next`. */
export const DEFAULT_SIGNED_IN_PATH = "/library";

/**
 * Pages that must never be a post-sign-in destination. Sending a signed-in
 * person back to /sign-in would bounce them straight back here, forever.
 */
const AUTH_PAGE_PREFIXES = ["/sign-in", "/sign-up", "/auth"];

const PARSE_BASE = "http://redline.invalid";

function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * The one check for a `next` redirect target. Accepts only a same-origin
 * relative path ("/library/abc?x=1"). Anything a browser could resolve to
 * another host ("//evil.com", "/\evil.com", "https://evil.com", a path with
 * control characters) falls back to `fallback`.
 */
export function safeNextPath(
  value: unknown,
  fallback: string = DEFAULT_SIGNED_IN_PATH,
): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  // Browsers treat a backslash like a forward slash in URLs, so "/\evil.com"
  // is protocol-relative to them. No legitimate path here contains one.
  if (value.includes("\\")) return fallback;
  // The URL parser strips tabs and newlines, which can turn "/<tab>/x" into
  // "//x". Refuse control characters outright.
  if (hasControlCharacter(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, PARSE_BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== PARSE_BASE) return fallback;
  if (AUTH_PAGE_PREFIXES.some((prefix) => startsWithSegment(url.pathname, prefix))) {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
