import { useState } from "react";
import { Link } from "react-router-dom";
import { signUpWithPassword } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { IconEye, IconEyeOff } from "../components/icons";

// Same ledger-paper flourish as Login.tsx -- see the comment there.
const LEDGER_BACKGROUND = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--color-rule) 31px, var(--color-rule) 32px)",
};

export function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signUpWithPassword(email, password);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-4"
      style={LEDGER_BACKGROUND}
    >
      <div className="flex w-full max-w-md flex-col gap-5 rounded-lg border border-rule bg-surface p-7 shadow-card sm:p-9">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">
            LedgerLab
          </h1>
          <p className="text-sm text-ink-muted">
            Track project costs, purchase orders, and payroll in one place.
          </p>
        </div>

        {submitted ? (
          <p className="rounded-sm border border-rule bg-canvas px-3 py-2 text-sm text-ink">
            Check your email to confirm your account.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <p className="rounded-sm border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                Email
              </span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 pr-10 text-sm text-ink outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-faint hover:text-ink-muted"
                >
                  {showPassword ? (
                    <IconEyeOff className="h-4 w-4" />
                  ) : (
                    <IconEye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="mt-1 justify-center"
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
