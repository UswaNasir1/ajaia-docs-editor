"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<File | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setChosen(file);
      setPending(true);
      setError(null);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/documents/import", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as {
          id?: string;
          warnings?: string[];
          error?: { message?: string };
        };

        if (!res.ok || !data.id) {
          setError(data.error?.message ?? "Could not import file");
          return;
        }

        for (const warning of data.warnings ?? []) {
          toast.message(warning);
        }
        onOpenChange(false);
        setChosen(null);
        router.push(`/docs/${data.id}`);
      } catch {
        setError("Network error importing file");
      } finally {
        setPending(false);
      }
    },
    [onOpenChange, router],
  );

  function takeFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    void upload(file);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
          setChosen(null);
          setDragging(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import file</DialogTitle>
          <DialogDescription>
            Upload a file to create a new editable document.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          aria-label="Choose file to import"
          disabled={pending}
          onChange={(e) => {
            takeFile(e.target.files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          disabled={pending}
          aria-label="Drop a file here or choose a file"
          className={cn(
            "flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-[12px] border-2 border-dashed px-4 py-8 text-center outline-none transition-colors duration-150",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ajaia-accent)]",
            dragging
              ? "border-[var(--ajaia-accent)] bg-[var(--ajaia-accent-soft)]"
              : "border-border bg-[var(--ajaia-page)] hover:border-[var(--ajaia-accent-ring)] hover:bg-[var(--ajaia-accent-soft)]/50",
          )}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            takeFile(e.dataTransfer.files);
          }}
        >
          {pending ? (
            <Loader2
              className="size-8 animate-spin text-[var(--ajaia-accent)]"
              aria-hidden
            />
          ) : (
            <Upload
              className="size-8 text-[var(--ajaia-accent)]"
              aria-hidden
            />
          )}
          <span className="text-sm font-medium text-[var(--ajaia-ink)]">
            {pending ? "Importing…" : "Drag a file here or browse"}
          </span>
          <span className="flex flex-wrap items-center justify-center gap-1.5">
            {[".txt", ".md", ".docx"].map((ext) => (
              <span
                key={ext}
                className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--ajaia-muted)] ring-1 ring-border"
              >
                {ext}
              </span>
            ))}
            <span className="text-[11px] text-muted-foreground">Max 2 MB</span>
          </span>
        </button>

        {chosen ? (
          <p className="flex items-center gap-2 text-sm text-[var(--ajaia-ink)]">
            <FileUp className="size-4 text-[var(--ajaia-accent)]" aria-hidden />
            <span className="min-w-0 truncate font-medium">{chosen.name}</span>
            <span className="shrink-0 text-muted-foreground">
              {formatBytes(chosen.size)}
            </span>
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-[var(--ajaia-danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            aria-label="Choose file"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Importing…
              </>
            ) : (
              "Choose file"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
