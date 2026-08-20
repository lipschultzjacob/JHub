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
  } catch {
    // The database rejects this insert if the email is already taken
    // (users.email has a unique constraint) -- that's the only likely
    // reason this would fail here.
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 }
    );
  }

  // Give the new user their own starter set of budgeting categories right away.
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })));

  return NextResponse.json({ success: true });
}
