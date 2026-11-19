"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/editor/toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DocumentDetail } from "@/lib/services/documents";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type DocumentEditorProps = {
  initial: DocumentDetail;
};

export function DocumentEditor({ initial }: DocumentEditorProps) {
  const router = useRouter();
  const canEdit = initial.role === "owner" || initial.role === "editor";
  const [title, setTitle] = useState(initial.title);
  const [savedTitle, setSavedTitle] = useState(initial.title);
  const [version, setVersion] = useState(initial.version);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);

  const versionRef = useRef(version);
  const dirtyRef = useRef(false);
  const titleRef = useRef(title);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const persistRef = useRef<
    (payload: { title?: string; contentHtml?: string }) => Promise<void>
  >(async () => undefined);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const persist = useCallback(
    async (payload: { title?: string; contentHtml?: string }) => {
      if (!canEdit || conflict || savingRef.current) return;
      savingRef.current = true;
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/documents/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            baseVersion: versionRef.current,
          }),
        });
        const data = (await res.json()) as {
          document?: DocumentDetail;
          version?: number;
          error?: { code?: string; message?: string };
        };

        if (res.status === 409) {
          setConflict(true);
          setSaveStatus("error");
          dirtyRef.current = false;
          setDirty(false);
          return;
        }

        if (!res.ok || !data.document) {
          setSaveStatus("error");
          toast.error(data.error?.message ?? "Failed to save — retrying");
          window.setTimeout(() => {
            void persistRef.current(payload);
          }, 1500);
          return;
        }

        setVersion(data.document.version);
        versionRef.current = data.document.version;
        if (payload.title !== undefined) {
          setSavedTitle(data.document.title);
          setTitle(data.document.title);
        }
        dirtyRef.current = false;
        setDirty(false);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
        toast.error("Offline/Failed to save — retrying");
        window.setTimeout(() => {
          void persistRef.current(payload);
        }, 2000);
      } finally {
        savingRef.current = false;
      }
    },
    [canEdit, conflict, initial.id],
  );

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  const scheduleContentSave = useCallback(
    (html: string) => {
      if (!canEdit || conflict) return;
      dirtyRef.current = true;
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist({ contentHtml: html });
      }, 800);
    },
    [canEdit, conflict, persist],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit && !conflict,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: initial.contentHtml || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral max-w-none min-h-[50vh] px-8 py-6 focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      scheduleContentSave(ed.getHTML());
    },
    onBlur: ({ editor: ed }) => {
      if (!canEdit || conflict) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) {
        void persist({ contentHtml: ed.getHTML() });
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEdit && !conflict);
  }, [editor, canEdit, conflict]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function commitTitle() {
    if (!canEdit || conflict) return;
    const next = titleRef.current.trim();
    if (!next || next === savedTitle) {
      setTitle(savedTitle);
      return;
    }
    if (next.length > 120) {
      toast.error("Title must be 1–120 characters");
      setTitle(savedTitle);
      return;
    }
    await persist({ title: next });
  }

  function statusLabel() {
    if (conflict) return "Conflict";
    if (saveStatus === "saving") return "Saving…";
    if (saveStatus === "saved") return "Saved";
    if (saveStatus === "error") return "Offline/Failed to save — retrying";
    return dirty ? "Unsaved changes" : "Saved";
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[linear-gradient(180deg,#f6f4ef_0%,#faf9f7_40%,#ffffff_100%)]">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="inline-flex h-7 items-center rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ← Docs
          </Link>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              dirtyRef.current = true;
              setDirty(true);
            }}
            onBlur={() => void commitTitle()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                setTitle(savedTitle);
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={!canEdit || conflict}
            aria-label="Document title"
            className="h-9 flex-1 border-transparent bg-transparent text-lg font-semibold shadow-none focus-visible:border-ring focus-visible:bg-background"
          />
          <span
            className="shrink-0 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {statusLabel()}
          </span>
        </div>
        {canEdit && !conflict ? <EditorToolbar editor={editor} /> : null}
      </header>

      {!canEdit ? (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900"
          role="status"
        >
          View only — you can read this document but not edit it.
        </div>
      ) : null}

      {conflict ? (
        <div
          className="flex flex-wrap items-center justify-center gap-3 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-950"
          role="alert"
        >
          <span>
            This document was updated by someone else. Reload to get the latest
            version.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              router.refresh();
              window.location.reload();
            }}
          >
            Reload
          </Button>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-4xl flex-1 px-2 py-6 sm:px-4">
        <div className="min-h-[70vh] rounded-sm border border-border/60 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
