"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/brand/avatar";
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
  documentTitle: string;
};

export function ShareDialog({ documentId, documentTitle }: ShareDialogProps) {
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
            size="sm"
            aria-label="Share document"
            className="gap-1.5 transition-colors duration-150"
          />
        }
      >
        <Users className="size-3.5" aria-hidden />
        Share
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share “{documentTitle}”</DialogTitle>
          <DialogDescription>
            Invite people by email. They must already have an account.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            void addShare();
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="share-email" className="sr-only">
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
              aria-invalid={!!error}
            />
            {error ? (
              <p className="text-sm text-[var(--ajaia-danger)]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <label htmlFor="share-role" className="sr-only">
              Role
            </label>
            <select
              id="share-role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "viewer" | "editor")
              }
              disabled={busy}
              className="h-8 rounded-lg border border-input bg-white px-2 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ajaia-accent)]"
              aria-label="Share role"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <Button
              type="submit"
              disabled={busy || !email.trim()}
              className="min-w-16"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Add"}
            </Button>
          </div>
        </form>

        <div className="mt-1 flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--ajaia-ink)]">
            People with access
          </p>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-[10px] border border-border">
              {owner ? (
                <li className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={owner.name} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {owner.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {owner.email}
                      </div>
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
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={share.name} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {share.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {share.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={share.role}
                      aria-label={`Role for ${share.name}`}
                      disabled={busy}
                      className="h-7 rounded-md border border-input bg-white px-1.5 text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ajaia-accent)]"
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
                      size="icon-sm"
                      disabled={busy}
                      aria-label={`Remove ${share.name}`}
                      onClick={() => void remove(share.userId)}
                    >
                      <Trash2 className="size-3.5 text-[var(--ajaia-danger)]" />
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
