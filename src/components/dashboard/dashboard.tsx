"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
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
import { formatRelativeTime } from "@/lib/format";
import type { DocSummary } from "@/lib/services/documents";

type DashboardProps = {
  userName: string;
  userEmail: string;
  initialOwned: DocSummary[];
  initialShared: DocSummary[];
};

function roleBadge(role: DocSummary["role"]) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Shared · Editor";
  return "Shared · Viewer";
}

export function Dashboard({
  userName,
  userEmail,
  initialOwned,
  initialShared,
}: DashboardProps) {
  const router = useRouter();
  const [owned, setOwned] = useState<DocSummary[]>(initialOwned);
  const [shared, setShared] = useState<DocSummary[]>(initialShared);
  const [creating, setCreating] = useState(false);
  const [renameDoc, setRenameDoc] = useState<DocSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<DocSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) {
        toast.error("Failed to load documents");
        return;
      }
      const data = (await res.json()) as {
        owned: DocSummary[];
        shared: DocSummary[];
      };
      setOwned(data.owned);
      setShared(data.shared);
    } catch {
      toast.error("Network error loading documents");
    }
  }, []);

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
      const current = await fetch(`/api/documents/${renameDoc.id}`);
      const currentData = (await current.json()) as {
        document?: { version: number };
        error?: { message?: string };
      };
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
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {emptyOwned
              ? "No documents yet. Create one to get started."
              : "Nothing shared with you yet."}
          </p>
          {emptyOwned ? (
            <Button
              className="mt-4"
              onClick={() => void createDocument()}
              disabled={creating}
            >
              <Plus className="size-4" />
              New document
            </Button>
          ) : null}
        </div>
      );
    }

    return (
      <ul className="divide-y divide-border rounded-lg border border-border">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center gap-3 px-3 py-3 hover:bg-muted/40"
          >
            <Link
              href={`/docs/${doc.id}`}
              className="min-w-0 flex-1 outline-none focus-visible:underline"
            >
              <div className="truncate font-medium">{doc.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
                <Badge variant="secondary">{roleBadge(doc.role)}</Badge>
                {doc.role === "owner" && (doc.sharedWithCount ?? 0) > 0 ? (
                  <span>
                    Shared with {doc.sharedWithCount}
                  </span>
                ) : null}
                {doc.role !== "owner" ? (
                  <span>Owner: {doc.ownerName}</span>
                ) : null}
              </div>
            </Link>
            {doc.role === "owner" || doc.role === "editor" ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
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
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <h1 className="text-2xl font-semibold tracking-tight">{userName}</h1>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => void createDocument()}
            disabled={creating}
            aria-label="New document"
          >
            <Plus className="size-4" />
            {creating ? "Creating…" : "New document"}
          </Button>
          <SignOutButton />
        </div>
      </header>

      <Tabs defaultValue="owned">
        <TabsList>
          <TabsTrigger value="owned">Owned by me</TabsTrigger>
          <TabsTrigger value="shared">Shared with me</TabsTrigger>
        </TabsList>
        <TabsContent value="owned" className="mt-4">
          {renderList(owned, true)}
        </TabsContent>
        <TabsContent value="shared" className="mt-4">
          {renderList(shared, false)}
        </TabsContent>
      </Tabs>

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
              onClick={() => void confirmDelete()}
              disabled={busyId === deleteDoc?.id}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
