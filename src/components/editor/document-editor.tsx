"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";
import { ShareDialog } from "@/components/editor/share-dialog";
import { EditorToolbar } from "@/components/editor/toolbar";
import { SessionChangedDialog } from "@/components/session-changed-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";
import { noStoreFetch } from "@/lib/fetch";
import type { DocumentDetail } from "@/lib/services/documents";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type DocumentEditorProps = {
  sessionUserId: string;
  sessionUserName: string;
  initial: DocumentDetail;
};

export function DocumentEditor({
  sessionUserId,
  sessionUserName,
  initial,
}: DocumentEditorProps) {
  const router = useRouter();
  const rememberedUserId = useRef(sessionUserId);
  const [role, setRole] = useState(initial.role);
  const isOwner = role === "owner";
  const canEdit = role === "owner" || role === "editor";
  const [title, setTitle] = useState(initial.title);
  const [savedTitle, setSavedTitle] = useState(initial.title);
  const [version, setVersion] = useState(initial.version);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sessionChangedName, setSessionChangedName] = useState<string | null>(
    null,
  );

  const versionRef = useRef(version);
  const dirtyRef = useRef(false);
  const titleRef = useRef(title);
  const canEditRef = useRef(canEdit);
  const roleRef = useRef(role);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pollingEnabledRef = useRef(true);
  const requestIdRef = useRef(0);
  const lastSavedHtmlRef = useRef(initial.contentHtml || "<p></p>");
  const editorRef = useRef<Editor | null>(null);
  const persistRef = useRef<
    (
      payload: { title?: string; contentHtml?: string },
      opts?: { keepalive?: boolean },
    ) => Promise<void>
  >(async () => undefined);

  const stopForSessionChange = useCallback((name?: string) => {
    pollingEnabledRef.current = false;
    dirtyRef.current = false;
    setDirty(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSessionChangedName(name ?? "another user");
  }, []);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    canEditRef.current = canEdit;
  }, [canEdit]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const handleAccessLost = useCallback(
    (message?: string) => {
      dirtyRef.current = false;
      setDirty(false);
      toast.error(message ?? "You no longer have access to this document");
      router.replace("/");
    },
    [router],
  );

  const checkAccess = useCallback(async () => {
    if (!pollingEnabledRef.current) return;
    const requestId = ++requestIdRef.current;
    try {
      const res = await fetch(`/api/documents/${initial.id}`, noStoreFetch);
      if (requestId !== requestIdRef.current) return;

      if (res.status === 401) {
        pollingEnabledRef.current = false;
        router.replace("/login");
        return;
      }
      if (res.status === 403 || res.status === 404) {
        const data = (await res.json()) as { error?: { message?: string } };
        if (requestId !== requestIdRef.current) return;
        handleAccessLost(data.error?.message);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        currentUserId?: string;
        currentUserName?: string;
        document?: DocumentDetail;
      };
      if (requestId !== requestIdRef.current) return;

      if (
        data.currentUserId &&
        data.currentUserId !== rememberedUserId.current
      ) {
        stopForSessionChange(data.currentUserName);
        return;
      }

      if (!data.document) return;

      const nextRole = data.document.role;
      if (nextRole !== roleRef.current) {
        setRole(nextRole);
        const nextCanEdit = nextRole === "owner" || nextRole === "editor";
        if (!nextCanEdit && dirtyRef.current) {
          dirtyRef.current = false;
          setDirty(false);
          if (saveTimer.current) clearTimeout(saveTimer.current);
          toast.message("Your access is now view only");
        } else if (nextCanEdit && roleRef.current === "viewer") {
          toast.message("You can edit this document now");
        }
      }
    } catch {
      // Quiet background check — ignore transient network errors.
    }
  }, [handleAccessLost, initial.id, router, stopForSessionChange]);

  useVisibilityPolling(checkAccess);

  const persist = useCallback(
    async (
      payload: { title?: string; contentHtml?: string },
      opts?: { keepalive?: boolean },
    ) => {
      if (
        !canEditRef.current ||
        conflict ||
        savingRef.current ||
        !pollingEnabledRef.current
      ) {
        return;
      }

      // Skip no-op content saves (autosave must not fire when nothing changed).
      if (
        payload.contentHtml !== undefined &&
        payload.title === undefined &&
        payload.contentHtml === lastSavedHtmlRef.current
      ) {
        dirtyRef.current = false;
        setDirty(false);
        return;
      }

      savingRef.current = true;
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/documents/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          ...noStoreFetch,
          keepalive: opts?.keepalive,
          body: JSON.stringify({
            ...payload,
            baseVersion: versionRef.current,
          }),
        });
        const data = (await res.json()) as {
          currentUserId?: string;
          currentUserName?: string;
          document?: DocumentDetail;
          version?: number;
          error?: { code?: string; message?: string };
        };

        if (res.status === 401) {
          pollingEnabledRef.current = false;
          router.replace("/login");
          return;
        }

        if (
          data.currentUserId &&
          data.currentUserId !== rememberedUserId.current
        ) {
          stopForSessionChange(data.currentUserName);
          setSaveStatus("idle");
          return;
        }

        if (res.status === 409) {
          setConflict(true);
          setSaveStatus("error");
          dirtyRef.current = false;
          setDirty(false);
          return;
        }

        if (res.status === 403 || res.status === 404) {
          handleAccessLost(data.error?.message);
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
        if (payload.contentHtml !== undefined) {
          lastSavedHtmlRef.current = payload.contentHtml;
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
    [conflict, handleAccessLost, initial.id, router, stopForSessionChange],
  );

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  const scheduleContentSave = useCallback(
    (html: string) => {
      if (!canEditRef.current || conflict) return;
      if (html === lastSavedHtmlRef.current) {
        dirtyRef.current = false;
        setDirty(false);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        return;
      }
      dirtyRef.current = true;
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist({ contentHtml: html });
      }, 800);
    },
    [conflict, persist],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit && !conflict,
    extensions: [
      // Underline comes from StarterKit in TipTap v3 — do not register twice.
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
      if (!canEditRef.current || conflict) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) {
        void persist({ contentHtml: ed.getHTML() });
      }
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEdit && !conflict);
  }, [editor, canEdit, conflict]);

  useEffect(() => {
    function flushPending(keepalive: boolean) {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const ed = editorRef.current;
      if (!ed || !dirtyRef.current || !canEditRef.current) return;
      const html = ed.getHTML();
      if (html === lastSavedHtmlRef.current) {
        dirtyRef.current = false;
        return;
      }
      void persistRef.current({ contentHtml: html }, { keepalive });
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      flushPending(true);
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Client-side navigation away from the editor.
      flushPending(true);
    };
  }, []);

  async function commitTitle() {
    if (!canEditRef.current || conflict) return;
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
      <SessionChangedDialog
        open={!!sessionChangedName}
        signedInAsName={sessionChangedName ?? sessionUserName}
      />
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
              const next = e.target.value;
              setTitle(next);
              const changed = next.trim() !== savedTitle;
              dirtyRef.current = changed;
              setDirty(changed);
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
            disabled={!canEdit || conflict || !!sessionChangedName}
            aria-label="Document title"
            className="h-9 flex-1 border-transparent bg-transparent text-lg font-semibold shadow-none focus-visible:border-ring focus-visible:bg-background"
          />
          {isOwner ? (
            <ShareDialog documentId={initial.id} />
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">
              Owner: {initial.ownerName}
            </span>
          )}
          <span
            className="shrink-0 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {statusLabel()}
          </span>
        </div>
        {canEdit && !conflict && !sessionChangedName ? (
          <EditorToolbar editor={editor} />
        ) : null}
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
