import { auth } from "@/auth";
import { NavLinks } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { metaText45 } from "@/components/recipes";

// The single top nav shown on every signed-in page (see the "(app)" route
// group's layout.tsx). Only lists routes that exist today -- Categories and
// Settings join once those screens are built (see docs/design/README.md's
// Nav spec).
export async function Nav() {
  const session = await auth();

  return (
    <nav className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3">
      <span className="mr-auto font-heading text-[18px] tracking-[0.04em]">JHUB</span>
      <NavLinks />
      <span className={`text-xs ${metaText45}`}>{session?.user?.email}</span>
      {/* Sign-out lives here temporarily -- the design spec puts it on the
          Settings screen (docs/design/README.md §7), but Settings doesn't
          exist yet (tracked in issue #7), so this is the only way to sign
          out in the meantime. Remove once Settings ships. */}
      <SignOutButton />
    </nav>
  );
}
