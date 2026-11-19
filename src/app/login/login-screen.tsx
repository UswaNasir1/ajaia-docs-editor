"use client";

import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

const FEATURES = [
  "Rich-text editing with autosave",
  "Import .txt, .md and .docx files",
  "Share with viewer or editor access",
] as const;

export function LoginScreen() {
  return (
    <main className="grid min-h-full flex-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <aside className="relative flex flex-col overflow-hidden bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] px-6 py-6 text-white lg:px-10 lg:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.12), transparent 40%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative z-10">
          <Logo inverted className="text-base" />
        </div>

        <div className="relative z-10 mt-6 flex flex-1 flex-col justify-center lg:mt-0">
          <h1 className="max-w-md text-[28px] leading-tight font-bold tracking-tight text-white sm:text-[40px] sm:leading-[1.1] lg:text-[44px]">
            Write together, ship faster.
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/80 sm:text-base">
            A lightweight collaborative editor for teams.
          </p>

          <ul className="mt-8 hidden flex-col gap-3 lg:flex">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check className="size-3.5 text-white" aria-hidden />
                </span>
                <span className="text-white/90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 mt-6 hidden text-xs text-white/60 lg:block">
          Demo environment
        </p>
      </aside>

      {/* Sign-in panel */}
      <section className="flex items-center justify-center bg-[#FAFAFA] px-4 py-10 sm:px-6 lg:px-8">
        <LoginForm />
      </section>
    </main>
  );
}
