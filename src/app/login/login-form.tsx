"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Avatar } from "@/components/brand/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEMO_USERS = [
  { label: "Alice", email: "alice@ajaia.test" },
  { label: "Bob", email: "bob@ajaia.test" },
  { label: "Carol", email: "carol@ajaia.test" },
] as const;

const DEMO_PASSWORD = "demo1234";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function login(nextEmail: string, nextPassword: string) {
    setPending(true);
    setPendingEmail(nextEmail);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const data = (await res.json()) as {
        user?: { id: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(data.error?.message ?? "Unable to sign in");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
      setPendingEmail(null);
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-[420px] rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_8px_30px_rgb(15_23_42/0.06)] sm:p-8",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
        "motion-reduce:animate-none",
      )}
    >
      <div className="mb-6">
        <h2 className="text-[26px] leading-tight font-semibold tracking-tight text-[var(--ajaia-ink)]">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-[var(--ajaia-muted)]">
          Sign in to open your documents
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void login(email, password);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-[var(--ajaia-ink)]"
          >
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={pending}
            className="h-11 rounded-[10px] px-3 text-sm md:text-sm focus-visible:border-[#4F46E5] focus-visible:ring-[3px] focus-visible:ring-[#4F46E5]/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-[var(--ajaia-ink)]"
          >
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={pending}
              className="h-11 rounded-[10px] px-3 pr-11 text-sm md:text-sm focus-visible:border-[#4F46E5] focus-visible:ring-[3px] focus-visible:ring-[#4F46E5]/30"
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--ajaia-muted)] transition-colors duration-150 hover:bg-[var(--ajaia-page)] hover:text-[var(--ajaia-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              disabled={pending}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div
            className="flex items-start gap-2 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-[10px] bg-[#4F46E5] text-white hover:bg-[#4338CA] focus-visible:ring-[#4F46E5]/40"
        >
          {pending &&
          !DEMO_USERS.some((u) => u.email === pendingEmail) ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#E5E7EB]" aria-hidden />
        <span className="text-xs font-medium tracking-wide text-[var(--ajaia-muted)] uppercase">
          or try a demo account
        </span>
        <span className="h-px flex-1 bg-[#E5E7EB]" aria-hidden />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {DEMO_USERS.map((user) => {
          const loading = pending && pendingEmail === user.email;
          return (
            <button
              key={user.email}
              type="button"
              disabled={pending}
              aria-label={`Sign in as ${user.label}`}
              onClick={() => {
                setEmail(user.email);
                setPassword(DEMO_PASSWORD);
                void login(user.email, DEMO_PASSWORD);
              }}
              className={cn(
                "flex flex-row items-center gap-2.5 rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-2.5 text-left transition-colors duration-150 sm:flex-col sm:items-start sm:py-3",
                "hover:border-[#4F46E5] hover:bg-[#EEF2FF]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]",
                "disabled:pointer-events-none disabled:opacity-60",
              )}
            >
              {loading ? (
                <Loader2
                  className="size-8 animate-spin text-[#4F46E5] sm:size-10"
                  aria-hidden
                />
              ) : (
                <Avatar name={user.label} size="lg" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--ajaia-ink)]">
                  {user.label}
                </span>
                <span className="block truncate text-[11px] text-[var(--ajaia-muted)]">
                  {user.email}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-[var(--ajaia-muted)]">
        Password for all demo accounts:{" "}
        <code className="rounded-md bg-[var(--ajaia-page)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ajaia-ink)] ring-1 ring-[#E5E7EB]">
          {DEMO_PASSWORD}
        </code>
      </p>
    </div>
  );
}
