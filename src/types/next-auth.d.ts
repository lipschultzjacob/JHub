// Auth.js's built-in types don't know we added a user ID to the session
// (see the `session` callback in src/auth.ts) -- this file tells TypeScript
// about that extra field so the rest of the app can use session.user.id
// without a type error.
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
