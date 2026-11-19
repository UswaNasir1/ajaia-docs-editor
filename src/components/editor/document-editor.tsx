"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AlertTriangle, ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/brand/avatar";
import { Logo } from "@/components/brand/logo";
import { RoleBadge } from "@/components/brand/role-badge";
import { ShareDialog } from "@/components/editor/share-dialog";
import { EditorToolbar } from "@/components/editor/toolbar";
import { SessionChangedDialog } from "@/components/session-changed-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";
import { noStoreFetch } from "@/lib/fetch";
import type { DocumentDetail } from "@/lib/services/documents";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type DocumentEditorProps = {
  sessionUserId: string;
  sessionUserName: string;
  initial: DocumentDetail;
};

function syncEmptyClass(ed: Editor) {
  ed.view.dom.classList.toggle("is-editor-empty", ed.isEmpty);
}

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
        class: "focus:outline-none",
        spellcheck: "true",
      },
    },
    onCreate: ({ editor: ed }) => {
      syncEmptyClass(ed);
    },
    onUpdate: ({ editor: ed }) => {
      syncEmptyClass(ed);
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

  const roleLabel =
    role === "editor" ? "Editor" : role === "viewer" ? "Viewer" : null;

  const savePill =
    conflict ? (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ajaia-amber-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ajaia-amber)]"
        aria-live="polite"
      >
        Conflict
      </span>
    ) : saveStatus === "saving" ? (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ajaia-page)] px-2.5 py-1 text-xs font-medium text-[var(--ajaia-muted)]"
        aria-live="polite"
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Saving…
      </span>
    ) : saveStatus === "error" ? (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ajaia-danger-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ajaia-danger)]"
        aria-live="polite"
      >
        Failed to save — retrying
      </span>
    ) : (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ajaia-success-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ajaia-success)]"
        aria-live="polite"
      >
        <Check className="size-3.5" aria-hidden />
        {dirty ? "Unsaved changes" : "Saved"}
      </span>
    );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--ajaia-page)]">
      <SessionChangedDialog
        open={!!sessionChangedName}
        signedInAsName={sessionChangedName ?? sessionUserName}
      />
      <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="inline-flex size-8 items-center justify-center rounded-[10px] text-[var(--ajaia-muted)] transition-colors duration-150 hover:bg-[var(--ajaia-page)] hover:text-[var(--ajaia-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ajaia-accent)]"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <Logo markOnly className="hidden sm:inline-flex" />
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
            className={cn(
              "h-9 min-w-0 flex-1 truncate rounded-[10px] border-0 bg-transparent px-2 text-lg font-semibold text-[var(--ajaia-ink)] shadow-none transition-colors duration-150 sm:text-xl",
              "hover:bg-[var(--ajaia-page)] focus-visible:bg-[var(--ajaia-page)] focus-visible:ring-0",
            )}
          />
          <div className="flex shrink-0 items-center gap-2">
            {savePill}
            {isOwner ? (
              <ShareDialog documentId={initial.id} documentTitle={savedTitle} />
            ) : roleLabel === "Editor" || roleLabel === "Viewer" ? (
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <RoleBadge
                  role={roleLabel === "Editor" ? "editor" : "viewer"}
                />
                <span className="text-xs text-[var(--ajaia-muted)]">
                  · {initial.ownerName}
                </span>
              </span>
            ) : null}
            <Avatar name={sessionUserName} size="sm" />
          </div>
        </div>
      </header>

      {canEdit && !conflict && !sessionChangedName ? (
        <EditorToolbar editor={editor} />
      ) : null}

      {!canEdit ? (
        <div
          className="flex items-center justify-center gap-2 border-b border-[var(--ajaia-amber-border)] bg-[var(--ajaia-amber-soft)] px-4 py-2 text-sm text-[var(--ajaia-amber)]"
          role="status"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          View only — you can read this document but not edit it.
        </div>
      ) : null}

      {conflict ? (
        <div
          className="flex flex-wrap items-center justify-center gap-3 border-b border-[var(--ajaia-amber-border)] bg-[var(--ajaia-amber-soft)] px-4 py-2.5 text-sm text-[var(--ajaia-amber)]"
          role="alert"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span>
            This document was updated by someone else. Reload to get the latest
            version.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-[var(--ajaia-amber-border)] bg-white"
            onClick={() => {
              router.refresh();
              window.location.reload();
            }}
          >
            Reload
          </Button>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[816px] flex-1 px-3 pb-10 pt-6 sm:px-4 sm:pt-8">
        <div
          className={cn(
            "ajaia-editor min-h-[1056px] rounded-sm border border-border bg-white shadow-[var(--ajaia-paper-shadow)]",
            "px-12 py-12 sm:px-[72px] sm:py-[72px]",
            (!canEdit || conflict) && "is-readonly",
          )}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
