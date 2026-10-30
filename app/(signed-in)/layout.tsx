import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { decideAccess, signInPathFor } from "@/lib/auth/access";
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/safe-redirect";
import { REQUEST_PATH_HEADER } from "@/lib/supabase/proxy";
import { getSignedInUser } from "@/lib/supabase/server";
import { SiteHeader } from "@/app/_components/site-header";

/**
 * The signed-in frame. Every screen in this route group needs an account, so
 * the layout checks the session itself as well as relying on the proxy.
 */
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const requestedPath = (await headers()).get(REQUEST_PATH_HEADER) ?? DEFAULT_SIGNED_IN_PATH;
  const url = new URL(requestedPath, "http://redline.invalid");
  const user = await getSignedInUser();

  const decision = decideAccess({
    pathname: url.pathname,
    search: url.search,
    signedIn: user !== null,
  });
  if (decision.kind === "redirect") redirect(decision.to);
  // Only protected screens belong in this group; never render the frame without a user.
  if (!user) redirect(signInPathFor(DEFAULT_SIGNED_IN_PATH));

  return (
    <div className="min-h-screen bg-carton text-carton-ink">
      <SiteHeader account={{ kind: "signed-in", user }} />
      <main className="mx-auto max-w-[86rem] px-4 pb-16 pt-5 sm:px-7 sm:pb-24">{children}</main>
    </div>
  );
}
