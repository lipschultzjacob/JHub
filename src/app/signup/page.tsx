"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonPrimary, inputBase, fieldLabel, bodyText65 } from "@/components/recipes";

// The signup form. Creating an account happens in two steps: first this
// posts to our own /api/auth/signup endpoint to actually create the user
// (Auth.js doesn't handle registration itself, only logging in), then it
// immediately logs the new account in so there's no separate "now go log in"
// step.
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Runs when the form is submitted: creates the account, then logs it in.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setIsSubmitting(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/transactions");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-6">
      <h1 className="font-heading text-[32px]">Sign up</h1>
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
            Password (min 8 characters)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
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
          {isSubmitting ? "Signing up..." : "Sign up"}
        </button>
      </form>
      <p className={`mt-4 text-sm ${bodyText65}`}>
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:text-[var(--color-accent-300)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
