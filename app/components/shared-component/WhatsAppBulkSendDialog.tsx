import { Ban, CheckCircle2, Circle, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import type {
  BulkRecipient,
  BulkSendJob,
} from "~/types/whatsapp.interface";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Spinner } from "../ui/spinner";
import WhatsAppIcon from "./WhatsAppIcon";

function RecipientRow({
  recipient,
  rowRef,
}: {
  recipient: BulkRecipient;
  rowRef?: React.Ref<HTMLLIElement>;
}) {
  const { status } = recipient;
  const active = status === "generating_report" || status === "sending";

  return (
    <li
      ref={rowRef}
      className={cn(
        "flex items-start gap-3 px-3 py-2.5",
        active && "bg-blue-50",
      )}
    >
      <span className="mt-0.5 shrink-0">
        {status === "success" && (
          <CheckCircle2 size={18} className="text-green-600" />
        )}
        {status === "failed" && <XCircle size={18} className="text-red-600" />}
        {status === "cancelled" && (
          <Ban size={18} className="text-textLightColor" />
        )}
        {status === "pending" && (
          <Circle size={18} className="text-borderColor" />
        )}
        {active && <Spinner className="size-[18px] text-blue-600" />}
      </span>

      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block break-words text-sm text-textColor",
            active && "font-semibold",
            status === "pending" && "text-textLightColor",
          )}
        >
          {recipient.poshakLeaderName}
        </span>
        {recipient.groupName && (
          <span className="block text-xs capitalize text-textLightColor">
            {recipient.groupName}
          </span>
        )}
        {status === "generating_report" && (
          <span className="block text-xs text-blue-700">
            Generating report…
          </span>
        )}
        {status === "sending" && (
          <span className="block text-xs text-blue-700">
            Sending to {recipient.displayNumber ?? "WhatsApp"}…
          </span>
        )}
        {(status === "failed" || status === "cancelled") && recipient.error && (
          <span
            className={cn(
              "block text-xs",
              status === "failed" ? "text-red-600" : "text-textLightColor",
            )}
          >
            {recipient.error}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Live progress of a "send to all Poshak Leaders" run. Closing it while the run
 * is in progress is safe — sending continues on the server and the dialog can
 * be reopened from the header button.
 */
export default function WhatsAppBulkSendDialog({
  open,
  onOpenChange,
  job,
  cancelling,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: BulkSendJob | null;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const activeRowRef = useRef<HTMLLIElement | null>(null);
  const running = job?.status === "running";
  const activeGroupId = job?.current?.groupId;

  // Keep the leader currently receiving the message in view.
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeGroupId]);

  if (!job) return null;

  const percent = job.total ? Math.round((job.completed / job.total) * 100) : 0;
  const title = running
    ? "Sending WhatsApp Reports"
    : job.status === "cancelled"
      ? "Sending cancelled"
      : job.status === "failed"
        ? "Sending stopped"
        : "Completed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-3 rounded-xl p-4 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-textColor">
            <WhatsAppIcon size={20} className="text-[#25D366]" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {running
              ? job.current
                ? `Now sending to ${job.current.poshakLeaderName}`
                : "Preparing…"
              : `${job.successCount} successfully sent · ${job.failedCount} failed`}
          </DialogDescription>
        </DialogHeader>

        {/* Counts + progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-textColor">
            <span className="font-medium">
              {job.completed} of {job.total} completed
            </span>
            <span className="flex gap-3 text-xs">
              <span className="text-green-700">✓ {job.successCount}</span>
              <span className="text-red-600">✕ {job.failedCount}</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-[#25D366] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {job.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {job.error}
          </p>
        )}

        {/* Per-leader status */}
        <ul className="min-h-0 flex-1 divide-y divide-borderColor overflow-y-auto rounded-lg border border-borderColor">
          {job.recipients.map((r) => (
            <RecipientRow
              key={r.groupId}
              recipient={r}
              rowRef={r.groupId === activeGroupId ? activeRowRef : undefined}
            />
          ))}
        </ul>

        <div className="flex flex-row gap-3">
          {running ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-full"
                onClick={onCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Stop sending"}
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-full bg-primaryColor text-white hover:bg-primaryColor/90"
                onClick={() => onOpenChange(false)}
              >
                Hide
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="flex-1 rounded-full bg-primaryColor text-white hover:bg-primaryColor/90"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )}
        </div>
        {running && (
          <p className="text-center text-xs text-textLightColor">
            Sending continues in the background if you hide this.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
