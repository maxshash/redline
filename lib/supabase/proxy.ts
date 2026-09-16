import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

/**
 * Request header the proxy sets to the path being requested (pathname plus
 * query string), so the signed-in layout can build a sign-in `next` link.
 * The proxy always overwrites it, and the value only ever feeds `next`,
 * which is sanitised before use.
 */
export const REQUEST_PATH_HEADER = "x-redline-path";

export interface RefreshedSession {
  signedIn: boolean;
  /** The pass-through response, carrying any refreshed auth cookies. */
  response: NextResponse;
  /** Copy refreshed auth cookies and no-cache headers onto another response. */
  carryOnto(target: NextResponse): NextResponse;
}

function forwardedRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return headers;
}

/**
 * Refreshes the Supabase session cookie for this request, following the
 * @supabase/ssr pattern: read cookies from the request, write refreshed ones
 * to both the request (for Server Components downstream) and the response
 * (for the browser). When Supabase is not configured nobody is signed in.
 */
export async function refreshSession(request: NextRequest): Promise<RefreshedSession> {
  let response = NextResponse.next({ request: { headers: forwardedRequestHeaders(request) } });
  let responseHeaders: Record<string, string> = {};

  const carryOnto = (target: NextResponse) => {
    for (const cookie of response.cookies.getAll()) target.cookies.set(cookie);
    for (const [key, value] of Object.entries(responseHeaders)) target.headers.set(key, value);
    return target;
  };

  const config = getSupabaseConfig();
  if (!config) return { signedIn: false, response, carryOnto };

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: forwardedRequestHeaders(request) } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        responseHeaders = headers;
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Do not put code between creating the client and this call: getClaims()
  // is what refreshes an expired session and writes the new cookies.
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = !error && Boolean(data?.claims?.sub);

  return {
    signedIn,
    get response() {
      return response;
    },
    carryOnto,
  };
}
