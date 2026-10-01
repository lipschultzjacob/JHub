"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthScreen, AuthFields, AuthField, AuthButton } from "@/components/auth-form";

// The Sign Up screen ("/signup"). Creating an account happens in two steps:
// first this posts to our own /api/auth/signup endpoint to actually create
// the user (Auth.js doesn't handle registration itself, only logging in),
// then it immediately logs the new account in so there's no separate "now
// go log in" step. The password is typed twice, and the two must match.
// The fields are marked as a new password, so iCloud Keychain offers a
// strong one and saves it.
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Runs when the form is submitted: checks the two passwords match, creates
  // the account, then logs it in.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setIsSubmitting(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      setIsSubmitting(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <AuthScreen
      subtitle="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-accent no-underline active:opacity-60">
            Log In
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthFields error={error}>
          <AuthField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthField
            label="Password (at least 8 characters)"
            type="password"
            autoComplete="new-password"
            minLength={8}
            enterKeyHint="next"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <AuthField
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            enterKeyHint="go"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </AuthFields>
        <AuthButton busy={isSubmitting}>{isSubmitting ? "Creating Account..." : "Sign Up"}</AuthButton>
      </form>
    </AuthScreen>
  );
}
