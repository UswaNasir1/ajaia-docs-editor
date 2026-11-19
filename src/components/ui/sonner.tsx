"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-[var(--ajaia-success)]" />
        ),
        info: <InfoIcon className="size-4 text-[var(--ajaia-accent)]" />,
        warning: (
          <TriangleAlertIcon className="size-4 text-[var(--ajaia-amber)]" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-[var(--ajaia-danger)]" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-[var(--ajaia-accent)]" />
        ),
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "var(--ajaia-ink)",
          "--normal-border": "#e5e7eb",
          "--border-radius": "10px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast border shadow-md",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
