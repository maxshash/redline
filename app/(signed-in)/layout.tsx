import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { decideAccess, signInPathFor } from "@/lib/auth/access";
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/safe-redirect";
import { REQUEST_PATH_HEADER } from "@/lib/supabase/proxy";
import { getSignedInUser } from "@/lib/supabase/server";
import { ShellNav } from "./_components/shell-nav";
import { SignOutButton } from "./_components/sign-out-button";

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
      <header className="mx-auto max-w-[86rem] px-4 pt-5 sm:px-7 sm:pt-7">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-[3px] border-ink bg-panel-field px-5 pb-0 pt-4 text-ink sm:px-8">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            <Link
              href="/library"
              className="pb-3 text-[1.25rem] font-extrabold uppercase leading-none tracking-[0.02em]"
            >
              Redline
            </Link>
            <ShellNav />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-3">
            <p className="font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
              Signed in as{" "}
              <span className="normal-case tracking-normal text-ink">{user.email ?? user.id}</span>
            </p>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[86rem] px-4 pb-16 pt-5 sm:px-7 sm:pb-24">{children}</main>
    </div>
  );
}
