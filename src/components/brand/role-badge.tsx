import { cn } from "@/lib/utils";

type RoleBadgeProps = {
  role: "editor" | "viewer";
  className?: string;
};

/** Soft role pill for shared documents. */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  const isEditor = role === "editor";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        isEditor
          ? "bg-[var(--ajaia-editor-viewer-soft)] text-[var(--ajaia-editor-viewer)]"
          : "bg-[var(--ajaia-viewer-amber-soft)] text-[var(--ajaia-viewer-amber)]",
        className,
      )}
    >
      {isEditor ? "Editor" : "Viewer"}
    </span>
  );
}
