"use client";

import { signOut } from "next-auth/react";

// A simple "Log out" button, used in the transactions page header.
export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-zinc-400 underline"
    >
      Log out
    </button>
  );
}
