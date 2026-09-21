"use client";

import { signOut } from "next-auth/react";
import { buttonGhost } from "@/components/recipes";

// A "Sign out" button, shown on the Settings screen.
export function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className={buttonGhost}>
      Sign out
    </button>
  );
}
