"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SessionChangedDialogProps = {
  open: boolean;
  signedInAsName: string;
};

export function SessionChangedDialog({
  open,
  signedInAsName,
}: SessionChangedDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        // Blocking — only Reload can dismiss via full reload.
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--ajaia-amber-soft)] text-[var(--ajaia-amber)]">
              <AlertTriangle className="size-4" aria-hidden />
            </span>
            Session changed
          </DialogTitle>
          <DialogDescription>
            Your session changed in another tab (now signed in as{" "}
            <span className="font-medium text-[var(--ajaia-ink)]">
              {signedInAsName}
            </span>
            ). Reload to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
