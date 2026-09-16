import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "@/lib/auth/access";
import { refreshSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const session = await refreshSession(request);
  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    signedIn: session.signedIn,
  });

  if (decision.kind === "redirect") {
    return session.carryOnto(NextResponse.redirect(new URL(decision.to, request.url)));
  }
  return session.response;
}

export const config = {
  matcher: [
    // Every page and route handler, so the session cookie stays fresh.
    // Skips build assets, image optimisation and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
