import { useState } from "react";
import { useMembers } from "~/hooks/useMembers";
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
import { toast } from "./Toaster";

interface DeleteMemberDialogProps {
  memberId: number;
  memberName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after a successful delete (e.g. navigate away from the detail page).
  onDeleted?: () => void;
}

/**
 * Confirmation dialog for deleting a member — owns the delete API call and its
 * loading / error state, and shows a toast on success or failure.
 */
export default function DeleteMemberDialog({
  memberId,
  memberName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteMemberDialogProps) {
  const { deleteMember } = useMembers();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteMember(memberId).unwrap();
      toast.success("Member deleted successfully");
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      const message =
        typeof err === "string" ? err : "Unable to delete this member.";
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !deleting) {
          setError(null);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-textColor">Delete Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            {memberName ? (
              <span className="font-medium capitalize">{memberName}</span>
            ) : (
              "this member"
            )}
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-errorColor">{error}</p>}

        <DialogFooter className="flex flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-full bg-deleteButtonColor text-white hover:bg-deleteButtonColor/90"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? (
              <span className="flex items-center gap-2">
                <Spinner /> Deleting...
              </span>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
