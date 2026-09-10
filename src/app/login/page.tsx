"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonPrimary, inputBase, fieldLabel, bodyText65 } from "@/components/recipes";

// The login form. Submitting it calls Auth.js's signIn function directly
// from the browser -- that's what actually checks the email/password
// against the database (see the `authorize` function in src/auth.ts) and
// sets the login session cookie if it matches.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Runs when the form is submitted: attempts to log in, then either shows
  // an error or sends you to the transactions page.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect email or password.");
      setIsSubmitting(false);
      return;
    }

    router.push("/transactions");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-6">
      <h1 className="font-heading text-[32px]">Log in</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className={fieldLabel}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full ${inputBase}`}
          />
        </div>
        <div>
          <label htmlFor="password" className={fieldLabel}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full ${inputBase}`}
          />
        </div>
        {/* No semantic red for errors -- the design system's one accent
            rule -- so this stands out by being full-strength ink against
            the surrounding secondary (65%) text, not by color. */}
        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}
        <button type="submit" disabled={isSubmitting} className={`w-full ${buttonPrimary}`}>
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className={`mt-4 text-sm ${bodyText65}`}>
        No account?{" "}
        <Link href="/signup" className="text-accent hover:text-[var(--color-accent-300)]">
          Sign up
        </Link>
      </p>
    </div>
  );
}
