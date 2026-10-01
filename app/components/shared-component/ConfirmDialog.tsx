import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Spinner } from "../ui/spinner";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmText: string;
  loadingText?: string;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
}

/** Generic Cancel / Confirm dialog in the app's dialog style. */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmText,
  loadingText,
  loading = false,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Don't let the dialog close mid-request.
        if (!loading) onOpenChange(isOpen);
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] rounded-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-textColor">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        <DialogFooter className="flex flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn(
              "flex-1 rounded-full text-white",
              destructive
                ? "bg-deleteButtonColor hover:bg-deleteButtonColor/90"
                : "bg-primaryColor hover:bg-primaryColor/90",
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner /> {loadingText ?? confirmText}
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
