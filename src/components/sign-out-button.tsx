"use client";

import { signOut } from "next-auth/react";
import { buttonGhost } from "@/components/recipes";

// A "Sign out" button. Temporarily lives in the top Nav (src/components/nav.tsx)
// since Settings -- its spec'd home -- doesn't exist yet.
export function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className={buttonGhost}>
      Sign out
    </button>
  );
}
