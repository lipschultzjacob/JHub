import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";

// Creates a new account. Auth.js itself only handles logging in, not
// registration -- this is our own plain endpoint the signup page submits
// to, separate from Auth.js's built-in routes.
export async function POST(request: Request) {
  // Blocks a script from flooding the app with fake accounts. Keyed by IP
  // rather than email -- unlike login, the email here is whatever the
  // attacker made up, so it isn't a useful thing to key on.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited(`signup:${ip}`)) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429 }
    );
  }

  const { email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // bcrypt.hash scrambles the password into something that can be checked
  // later (at login) but never turned back into the original password. The
  // second argument (10) is the "cost" -- how many times it scrambles the
  // password, which controls how slow (and therefore hard to brute-force)
  // checking it is.
  const passwordHash = await bcrypt.hash(password, 10);

  // New accounts start with no categories -- you create your own on the
  // Categories screen.
  try {
    await db.insert(users).values({ email, passwordHash });
  } catch (err) {
    // Postgres error code 23505 specifically means "unique constraint
    // violated" -- that's the real signal that this email is already taken
    // (users.email has a unique constraint). Anything else is a genuine,
    // different failure (e.g. a database connection problem) and should
    // NOT be reported to the user as "email taken" -- that would be
    // actively misleading. It's logged here so it shows up in Vercel's
    // function logs for debugging, and reported as a generic server error.
    const isDuplicateEmail =
      typeof err === "object" && err !== null && "code" in err && err.code === "23505";
    if (isDuplicateEmail) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 }
      );
    }
    console.error("Signup failed:", err);
    return NextResponse.json(
      { error: "Something went wrong creating your account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
