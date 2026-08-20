"use client";

import { SessionProvider } from "next-auth/react";

// Makes the current login session available to every Client Component in
// the app (via the useSession hook, and for signIn/signOut to work
// reliably). Wraps the whole app once, in layout.tsx.
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
