import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  markOnly?: boolean;
  /** On dark/gradient panels use inverted mark (white tile). */
  inverted?: boolean;
};

/** Brand mark + wordmark — matches login. */
export function Logo({
  className,
  markOnly = false,
  inverted = false,
}: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 font-semibold", className)}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-[10px] shadow-sm",
          inverted
            ? "bg-white text-[var(--ajaia-accent)]"
            : "bg-[var(--ajaia-accent)] text-white",
        )}
      >
        <FileText className="size-4" />
      </span>
      {markOnly ? (
        <span className="sr-only">Ajaia Docs</span>
      ) : (
        <span
          className={cn(
            "text-sm tracking-tight",
            inverted ? "text-white" : "text-[var(--ajaia-ink)]",
          )}
        >
          Ajaia Docs
        </span>
      )}
    </span>
  );
}
