"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Screens that exist today. Later tickets add theirs here. */
const SCREENS = [
  { href: "/library", label: "Library" },
  { href: "/red-lines", label: "Red lines" },
  { href: "/analyze", label: "Check a document" },
] as const;

export function ShellNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account">
      <ul className="flex gap-x-6">
        {SCREENS.map((screen) => {
          const current = pathname === screen.href || pathname.startsWith(`${screen.href}/`);
          return (
            <li key={screen.href}>
              <Link
                href={screen.href}
                aria-current={current ? "page" : undefined}
                className={`block border-b-[7px] pb-2 text-[0.9375rem] font-bold uppercase leading-[1.2] tracking-[0.06em] ${
                  current ? "border-ink text-ink" : "border-transparent text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {screen.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
