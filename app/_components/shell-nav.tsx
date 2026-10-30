"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface Screen {
  href: string;
  label: string;
}

export function ShellNav({ screens }: { screens: readonly Screen[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap gap-x-6">
        {screens.map((screen) => {
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
