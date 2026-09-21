import { auth } from "@/auth";
import { NavLinks } from "@/components/nav-links";
import { metaText45 } from "@/components/recipes";

// The single top nav shown on every signed-in page (see the "(app)" route
// group's layout.tsx). Sign-out lives on the Settings screen.
export async function Nav() {
  const session = await auth();

  return (
    <nav className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3">
      <span className="mr-auto font-heading text-[18px] tracking-[0.04em]">JHUB</span>
      <NavLinks />
      <span className={`text-xs ${metaText45}`}>{session?.user?.email}</span>
    </nav>
  );
}
