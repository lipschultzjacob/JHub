"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthScreen, AuthFields, AuthField, AuthButton } from "@/components/auth-form";

// The Log In screen ("/login"). Submitting calls Auth.js's signIn function
// directly (redirect: false) so a wrong password can be shown right here
// instead of Auth.js bouncing to its own error page. On success it goes to
// Overview. The fields are set up so iCloud Keychain can fill in a saved
// password.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Runs when the form is submitted: checks the email and password, then
  // goes to Overview, or shows an error.
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

    router.push("/");
    router.refresh();
  }

  return (
    <AuthScreen
      subtitle="Log in to continue"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent no-underline active:opacity-60">
            Sign Up
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
            label="Password"
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthFields>
        <AuthButton busy={isSubmitting}>{isSubmitting ? "Logging In..." : "Log In"}</AuthButton>
      </form>
    </AuthScreen>
  );
}
