"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Founder Profiles" },
  { href: "/dashboard", label: "Dashboard" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="nav-wrap">
      <nav className="pill-nav">
        {items.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? "pill-link pill-link-active" : "pill-link"}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
