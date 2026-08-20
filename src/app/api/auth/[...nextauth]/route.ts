// This one file handles every login-related URL Auth.js needs (signing in,
// signing out, checking the current session, etc.) -- it's Auth.js's own
// required wiring, not something we write logic into ourselves. The actual
// configuration lives in src/auth.ts.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
