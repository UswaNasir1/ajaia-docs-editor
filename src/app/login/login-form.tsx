"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function login(nextEmail: string, nextPassword: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const data = (await res.json()) as {
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
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void login(email, password);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Demo accounts</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {DEMO_USERS.map((user) => (
            <Button
              key={user.email}
              type="button"
              variant="outline"
              className="flex-1"
              disabled={pending}
              aria-label={`Sign in as ${user.label}`}
              onClick={() => {
                setEmail(user.email);
                setPassword(DEMO_PASSWORD);
                void login(user.email, DEMO_PASSWORD);
              }}
            >
              Sign in as {user.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Password for all demo accounts: <code>{DEMO_PASSWORD}</code>
          <br />
          alice@ajaia.test · bob@ajaia.test · carol@ajaia.test
        </p>
      </div>
    </div>
  );
}
