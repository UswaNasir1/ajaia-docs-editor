"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ShareCollaborator, SharesResponse } from "@/lib/services/shares";

type ShareDialogProps = {
  documentId: string;
};

export function ShareDialog({ documentId }: ShareDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [owner, setOwner] = useState<ShareCollaborator | null>(null);
  const [shares, setShares] = useState<ShareCollaborator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`);
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = (await res.json()) as SharesResponse & {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(data.error?.message ?? "Could not load shares");
        return;
      }
      setOwner(data.owner);
      setShares(data.shares);
    } catch {
      setError("Network error loading shares");
    } finally {
      setLoading(false);
    }
  }, [documentId, router]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      void load();
    } else {
      setEmail("");
      setError(null);
    }
  }

  async function addShare() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? "Could not share document");
        return;
      }
      setEmail("");
      toast.success("Access updated");
      await load();
    } catch {
      setError("Network error sharing document");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, nextRole: "viewer" | "editor") {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/documents/${documentId}/shares/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: nextRole }),
        },
      );
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        toast.error(data.error?.message ?? "Could not update role");
        return;
      }
      toast.success("Role updated");
      await load();
    } catch {
      toast.error("Network error updating role");
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/documents/${documentId}/shares/${userId}`,
        { method: "DELETE" },
      );
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        toast.error(data.error?.message ?? "Could not remove access");
        return;
      }
      toast.success("Access removed");
      await load();
    } catch {
      toast.error("Network error removing access");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Share document"
          />
        }
      >
        Share
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Invite people by email. They must already have an account.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void addShare();
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="share-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bob@ajaia.test"
              required
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="share-role" className="text-sm font-medium">
              Role
            </label>
            <select
              id="share-role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "viewer" | "editor")
              }
              disabled={busy}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              aria-label="Share role"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <Button type="submit" disabled={busy || !email.trim()}>
            Add
          </Button>
        </form>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex flex-col gap-2">
          <p className="text-sm font-medium">People with access</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {owner ? (
                <li className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {owner.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {owner.email}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Owner
                  </span>
                </li>
              ) : null}
              {shares.map((share) => (
                <li
                  key={share.userId}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {share.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {share.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={share.role}
                      aria-label={`Role for ${share.name}`}
                      disabled={busy}
                      className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
                      onChange={(e) =>
                        void changeRole(
                          share.userId,
                          e.target.value as "viewer" | "editor",
                        )
                      }
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void remove(share.userId)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
