import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, categories } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

// Creates a new account. Auth.js itself only handles logging in, not
// registration -- this is our own plain endpoint the signup page submits
// to, separate from Auth.js's built-in routes.
export async function POST(request: Request) {
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

  let userId: number;
  try {
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning({ id: users.id });
    userId = user.id;
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

  // Give the new user their own starter set of budgeting categories right away.
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })));

  return NextResponse.json({ success: true });
}
