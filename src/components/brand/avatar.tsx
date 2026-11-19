import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const PALETTE = [
  { bg: "#EEF2FF", fg: "#4338CA" },
  { bg: "#ECFDF5", fg: "#047857" },
  { bg: "#FFF7ED", fg: "#C2410C" },
  { bg: "#FDF2F8", fg: "#BE185D" },
  { bg: "#EFF6FF", fg: "#1D4ED8" },
  { bg: "#F5F3FF", fg: "#6D28D9" },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length]!;
}

/** Initials tile with a deterministic color from the name. */
export function Avatar({ name, className, size = "md" }: AvatarProps) {
  const color = colorFor(name);
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-10 text-sm",
        className,
      )}
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {initials(name)}
    </span>
  );
}
