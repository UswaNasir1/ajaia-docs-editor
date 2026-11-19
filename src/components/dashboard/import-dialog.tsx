"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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

type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import file</DialogTitle>
          <DialogDescription>
            Upload a .txt, .md, or .docx file (max 2 MB). It becomes a new
            editable document.
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
          className={`flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            dragging
              ? "border-foreground bg-muted/60"
              : "border-border hover:bg-muted/40"
          }`}
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
          <Upload className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">
            {pending
              ? "Importing…"
              : "Drag and drop a file here, or click to browse"}
          </span>
          <span className="text-xs text-muted-foreground">
            Supported: .txt, .md, .docx · Max 2 MB
          </span>
        </button>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
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
            {pending ? "Importing…" : "Choose file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
