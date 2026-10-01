import { ListSection, rowSeparatorClass } from "@/components/grouped-list";

// Shared building blocks for the Log In and Sign Up screens, so the two look
// identical: the app icon and name at the top, the fields as an iOS grouped
// section, a full-width button, and a link to the other screen underneath.
// No React hooks here, so the pages (which hold the form state) can use them
// freely.

// The whole screen: centered in a phone-width column, with the app icon,
// "JHub", and a short line (e.g. "Log in to continue") at the top.
export function AuthScreen({
  subtitle,
  children,
  footer,
}: {
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col justify-center gap-8 px-safe pt-safe pb-safe">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* The app icon, rounded like an iPhone home-screen icon. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a small static icon; no resizing needed */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={84}
          height={84}
          style={{ borderRadius: 20, boxShadow: "var(--card-shadow)" }}
        />
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-large-title">JHub</h1>
          <p className="m-0 text-subheadline text-text-secondary">{subtitle}</p>
        </div>
      </div>
      {children}
      <p className="m-0 text-center text-subheadline text-text-secondary">{footer}</p>
    </div>
  );
}

// The fields, as one grouped section. `error` shows in red underneath.
export function AuthFields({ error, children }: { error?: string | null; children: React.ReactNode }) {
  return (
    <ListSection footer={error ? <span role="alert" className="text-red">{error}</span> : undefined}>
      {children}
    </ListSection>
  );
}

// One text box as a row of the grouped section. 17px text (no iPhone zoom
// on tap); the placeholder doubles as its label, as in iOS forms. The
// `autoComplete` value is what lets iCloud Keychain fill in, suggest and
// save passwords ("username", "current-password", "new-password").
export function AuthField(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return (
    <div className={`relative bg-surface px-gutter ${rowSeparatorClass}`}>
      <input
        aria-label={label}
        placeholder={label}
        required
        className="min-h-11 w-full bg-transparent text-body outline-none placeholder:text-text-secondary"
        {...input}
      />
    </div>
  );
}

// The full-width filled button that submits the form.
export function AuthButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex min-h-[50px] w-full items-center justify-center bg-accent text-headline text-on-accent active:opacity-60 disabled:opacity-45"
      style={{ borderRadius: 14 }}
    >
      {children}
    </button>
  );
}
