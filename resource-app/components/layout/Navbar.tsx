"use client";

import {
  LayoutDashboard,
  Users,
  Sparkles,
  Radar,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resources", label: "Resources", icon: Users },
  { href: "/people-informatics", label: "People Informatics", icon: Radar },
  { href: "/staffing", label: "AI Recommender", icon: Sparkles },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ey-gray-100 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-display text-2xl font-bold tracking-tight text-ey-black">
            EY
          </span>
          <span className="flex h-6 items-center gap-[3px]" aria-hidden>
            <span className="h-6 w-[5px] -skew-x-[18deg] bg-ey-yellow" />
            <span className="h-5 w-[5px] -skew-x-[18deg] bg-ey-yellow" />
            <span className="h-4 w-[5px] -skew-x-[18deg] bg-ey-yellow" />
          </span>
          <span className="hidden border-l border-ey-gray-200 pl-3 text-sm font-semibold text-ey-ink sm:inline">
            Resource Management
          </span>
        </Link>

        <nav className="flex h-16 items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex h-full items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
                  active
                    ? "border-ey-yellow text-ey-black"
                    : "border-transparent text-ey-gray hover:text-ey-ink",
                )}
              >
                <Icon size={16} />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
