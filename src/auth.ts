// Sets up Auth.js (the login library) for the whole app. Everywhere else
// that needs to know "who's logged in right now" imports `auth` from here,
// and the actual login form submits to the routes this configuration wires
// up automatically.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // "JWT" sessions: your logged-in state is stored in an encrypted cookie in
  // your browser (using AUTH_SECRET to encrypt it) rather than as a row in
  // the database. Simpler to set up; the tradeoff is there's no built-in way
  // to force a specific session to log out early other than changing your
  // password (which invalidates the whole account, not just one session).
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // "Credentials" is Auth.js's name for a plain email+password login,
    // as opposed to something like "sign in with Google." We have to write
    // the actual checking logic ourselves below, since Auth.js doesn't know
    // about our own users table.
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // Called every time someone submits the login form. Returning a user
      // object means "login succeeded"; returning null means "rejected."
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email));
        if (!user) return null;

        // bcrypt.compare checks the typed-in password against the stored
        // scrambled version without ever needing to un-scramble it.
        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!passwordMatches) return null;

        return { id: String(user.id), email: user.email };
      },
    }),
  ],
  callbacks: {
    // Runs whenever the session cookie (the "JWT") is created or checked.
    // By default it only carries default fields like email -- this adds our
    // own database user ID onto it so the rest of the app can use it.
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    // Shapes what `auth()` (used everywhere else in the app) actually
    // returns -- copies the user ID from the token above onto session.user.
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
