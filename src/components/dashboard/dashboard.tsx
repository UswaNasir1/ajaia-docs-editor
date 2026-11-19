"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  FileText,
  Lock,
  MoreHorizontal,
  Plus,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/brand/avatar";
import { RoleBadge } from "@/components/brand/role-badge";
import { ImportDialog } from "@/components/dashboard/import-dialog";
import { AppHeader } from "@/components/layout/app-header";
import { SessionChangedDialog } from "@/components/session-changed-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";
import { noStoreFetch } from "@/lib/fetch";
import { formatRelativeTime } from "@/lib/format";
import type { DocSummary } from "@/lib/services/documents";
import { cn } from "@/lib/utils";

type DashboardProps = {
  userId: string;
  userName: string;
  userEmail: string;
  initialOwned: DocSummary[];
  initialShared: DocSummary[];
};

export function Dashboard({
  userId,
  userName,
  userEmail,
  initialOwned,
  initialShared,
}: DashboardProps) {
  const router = useRouter();
  const rememberedUserId = useRef(userId);
  const [headerName, setHeaderName] = useState(userName);
  const [owned, setOwned] = useState<DocSummary[]>(initialOwned);
  const [shared, setShared] = useState<DocSummary[]>(initialShared);
  const [creating, setCreating] = useState(false);
  const [renameDoc, setRenameDoc] = useState<DocSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<DocSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sessionChangedName, setSessionChangedName] = useState<string | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const pollingEnabledRef = useRef(true);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!pollingEnabledRef.current) return;
      const requestId = ++requestIdRef.current;
      try {
        const res = await fetch("/api/documents", noStoreFetch);
        if (requestId !== requestIdRef.current) return;

        if (res.status === 401) {
          pollingEnabledRef.current = false;
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          if (!opts?.quiet) toast.error("Failed to load documents");
          return;
        }
        const data = (await res.json()) as {
          currentUserId?: string;
          currentUserName?: string;
          owned: DocSummary[];
          shared: DocSummary[];
        };
        if (requestId !== requestIdRef.current) return;

        if (
          data.currentUserId &&
          data.currentUserId !== rememberedUserId.current
        ) {
          pollingEnabledRef.current = false;
          setSessionChangedName(data.currentUserName ?? "another user");
          return;
        }

        if (data.currentUserName) setHeaderName(data.currentUserName);
        setOwned(data.owned);
        setShared(data.shared);
      } catch {
        if (requestId !== requestIdRef.current) return;
        if (!opts?.quiet) toast.error("Network error loading documents");
      }
    },
    [router],
  );

  const quietRefresh = useCallback(() => {
    if (!pollingEnabledRef.current) return;
    void load({ quiet: true });
  }, [load]);

  useVisibilityPolling(quietRefresh);

  async function createDocument() {
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        document?: { id: string };
        error?: { message?: string };
      };
      if (!res.ok || !data.document) {
        toast.error(data.error?.message ?? "Could not create document");
        return;
      }
      router.push(`/docs/${data.document.id}`);
    } catch {
      toast.error("Network error creating document");
    } finally {
      setCreating(false);
    }
  }

  async function submitRename() {
    if (!renameDoc) return;
    const title = renameValue.trim();
    if (!title || title.length > 120) {
      toast.error("Title must be 1–120 characters");
      return;
    }
    setBusyId(renameDoc.id);
    try {
      const current = await fetch(
        `/api/documents/${renameDoc.id}`,
        noStoreFetch,
      );
      const currentData = (await current.json()) as {
        currentUserId?: string;
        currentUserName?: string;
        document?: { version: number };
        error?: { message?: string };
      };
      if (
        currentData.currentUserId &&
        currentData.currentUserId !== rememberedUserId.current
      ) {
        pollingEnabledRef.current = false;
        setSessionChangedName(currentData.currentUserName ?? "another user");
        return;
      }
      if (!current.ok || !currentData.document) {
        toast.error(currentData.error?.message ?? "Could not load document");
        return;
      }
      const res = await fetch(`/api/documents/${renameDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          baseVersion: currentData.document.version,
        }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        toast.error(data.error?.message ?? "Could not rename document");
        return;
      }
      setRenameDoc(null);
      await load();
    } catch {
      toast.error("Network error renaming document");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteDoc) return;
    setBusyId(deleteDoc.id);
    try {
      const res = await fetch(`/api/documents/${deleteDoc.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        toast.error(data.error?.message ?? "Could not delete document");
        return;
      }
      setDeleteDoc(null);
      await load();
    } catch {
      toast.error("Network error deleting document");
    } finally {
      setBusyId(null);
    }
  }

  function renderList(docs: DocSummary[], emptyOwned: boolean) {
    if (docs.length === 0) {
      return (
        <div className="flex flex-col items-center rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-14 text-center">
          <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-[var(--ajaia-accent-soft)] text-[var(--ajaia-accent)]">
            {emptyOwned ? (
              <FileText className="size-5" aria-hidden />
            ) : (
              <Users className="size-5" aria-hidden />
            )}
          </span>
          <h3 className="text-base font-semibold text-[var(--ajaia-ink)]">
            {emptyOwned ? "No documents yet" : "Nothing shared with you yet"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--ajaia-muted)]">
            {emptyOwned
              ? "Create a document to get started, or import a file."
              : "When someone shares a document with you, it will show up here."}
          </p>
          {emptyOwned ? (
            <Button
              className="mt-5 h-10 rounded-[10px] bg-[var(--ajaia-accent)] hover:bg-[var(--ajaia-accent-hover)]"
              onClick={() => void createDocument()}
              disabled={creating || !!sessionChangedName}
              aria-label="New document"
            >
              <Plus className="size-4" />
              New document
            </Button>
          ) : null}
        </div>
      );
    }

    return (
      <ul className="overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white">
        {docs.map((doc) => {
          const sharedCount = doc.sharedWithCount ?? 0;
          const isOwner = doc.role === "owner";
          return (
            <li
              key={doc.id}
              className="group relative flex items-center gap-3 border-b border-[#E5E7EB] px-3 py-3 last:border-b-0 transition-colors duration-150 hover:bg-[#F9FAFB] sm:px-4"
            >
              <Link
                href={`/docs/${doc.id}`}
                className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ajaia-accent)]"
                aria-label={`Open ${doc.title}`}
              />
              <span className="relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ajaia-accent-soft)] text-[var(--ajaia-accent)]">
                <FileText className="size-4" aria-hidden />
              </span>
              <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
                <div className="truncate text-[15px] font-medium text-[var(--ajaia-ink)] sm:text-base">
                  {doc.title}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ajaia-muted)]">
                  <span>Edited {formatRelativeTime(doc.updatedAt)}</span>
                  {isOwner ? (
                    sharedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ajaia-canvas)] px-2 py-0.5 ring-1 ring-[#E5E7EB]">
                        <Users className="size-3" aria-hidden />
                        Shared with {sharedCount}{" "}
                        {sharedCount === 1 ? "person" : "people"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="size-3" aria-hidden />
                        Private
                      </span>
                    )
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={doc.ownerName} size="sm" />
                        Shared by {doc.ownerName}
                      </span>
                      {doc.role === "editor" || doc.role === "viewer" ? (
                        <RoleBadge role={doc.role} />
                      ) : null}
                    </>
                  )}
                </div>
              </div>
              {doc.role === "owner" || doc.role === "editor" ? (
                <div
                  className={cn(
                    "relative z-10 shrink-0 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-[8px]"
                          aria-label={`Actions for ${doc.title}`}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-36">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameDoc(doc);
                          setRenameValue(doc.title);
                        }}
                      >
                        Rename
                      </DropdownMenuItem>
                      {doc.role === "owner" ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteDoc(doc)}
                        >
                          Delete
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--ajaia-canvas)]">
      <AppHeader userName={headerName} userEmail={userEmail} />

      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[var(--ajaia-ink)]">
              Your documents
            </h1>
            <p className="mt-1 text-sm text-[var(--ajaia-muted)]">
              Create, import, and manage what you own or what’s shared with you.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className="h-10 w-full rounded-[10px] border-[#E5E7EB] sm:w-auto"
              onClick={() => setImportOpen(true)}
              disabled={!!sessionChangedName}
              aria-label="Import file"
            >
              <Upload className="size-4" />
              Import file
            </Button>
            <Button
              className="h-10 w-full rounded-[10px] bg-[var(--ajaia-accent)] hover:bg-[var(--ajaia-accent-hover)] sm:w-auto"
              onClick={() => void createDocument()}
              disabled={creating || !!sessionChangedName}
              aria-label="New document"
            >
              <Plus className="size-4" />
              {creating ? "Creating…" : "New document"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="owned">
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-4 rounded-none border-b border-[#E5E7EB] bg-transparent p-0"
          >
            <TabsTrigger
              value="owned"
              className="rounded-none px-0 pb-2.5 text-sm text-[var(--ajaia-muted)] data-active:bg-transparent data-active:text-[var(--ajaia-accent)] data-active:shadow-none after:bg-[var(--ajaia-accent)]"
            >
              Owned by me
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ajaia-accent-soft)] px-1.5 text-[11px] font-medium text-[var(--ajaia-accent)]">
                {owned.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="shared"
              className="rounded-none px-0 pb-2.5 text-sm text-[var(--ajaia-muted)] data-active:bg-transparent data-active:text-[var(--ajaia-accent)] data-active:shadow-none after:bg-[var(--ajaia-accent)]"
            >
              Shared with me
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ajaia-page)] px-1.5 text-[11px] font-medium text-[var(--ajaia-muted)]">
                {shared.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="owned" className="mt-4">
            {renderList(owned, true)}
          </TabsContent>
          <TabsContent value="shared" className="mt-4">
            {renderList(shared, false)}
          </TabsContent>
        </Tabs>
      </main>

      <SessionChangedDialog
        open={!!sessionChangedName}
        signedInAsName={sessionChangedName ?? ""}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog
        open={!!renameDoc}
        onOpenChange={(open) => {
          if (!open) setRenameDoc(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
            <DialogDescription>
              Choose a title between 1 and 120 characters.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            aria-label="Document title"
            autoFocus
            className="h-11 rounded-[10px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDoc(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[var(--ajaia-accent)] hover:bg-[var(--ajaia-accent-hover)]"
              onClick={() => void submitRename()}
              disabled={busyId === renameDoc?.id}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteDoc}
        onOpenChange={(open) => {
          if (!open) setDeleteDoc(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              “{deleteDoc?.title}” will be permanently deleted. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-[var(--ajaia-danger)] text-white hover:bg-[var(--ajaia-danger)]/90"
              onClick={() => void confirmDelete()}
              disabled={busyId === deleteDoc?.id}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
