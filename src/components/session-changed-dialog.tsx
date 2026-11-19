"use client";

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
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Session changed</DialogTitle>
          <DialogDescription>
            Your session changed in another tab (now signed in as{" "}
            {signedInAsName}). Reload to continue.
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
