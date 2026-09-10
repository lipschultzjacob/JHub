"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// More links (Categories, Settings) join this list once those screens exist
// -- see docs/design/README.md's Nav spec for the full set.
const links = [
  { href: "/", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
];

// The nav's page links, split into their own Client Component because only
// Client Components can read the current URL (usePathname) to know which
// link to mark aria-current="page". Nav itself (nav.tsx) stays a Server
// Component so it can look up the signed-in email directly.
export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className="text-sm hover:text-accent aria-[current=page]:text-accent"
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
