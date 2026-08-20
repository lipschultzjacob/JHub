// In this Next.js version, this file (not "middleware.ts" -- that name was
// renamed to "proxy" in Next.js 16) runs before every page request that
// matches the pattern at the bottom, before the actual page even starts
// rendering. This is what keeps someone who isn't logged in from reaching
// any page except the login and signup pages themselves.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup";

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (isLoggedIn && isAuthPage) {
    // Already signed in -- no reason to show the login/signup forms again.
    return NextResponse.redirect(new URL("/transactions", req.nextUrl));
  }
});

// Which URLs this runs on: everything EXCEPT api routes (those each check
// login status themselves and return a clean error instead of a redirect --
// see e.g. src/app/api/plaid/sync/route.ts) and static files like icons/the
// service worker that need to load either way.
//
// Important: this file protects PAGES, but it's not the only thing standing
// between an attacker and the data. Next.js's own docs warn that a future
// change to this matcher could silently stop protecting a route without it
// being obvious -- so every API route also checks `auth()` for itself
// rather than trusting this file alone. Don't remove those checks assuming
// this file already covers it.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|sw.js).*)",
  ],
};
