import {
  AlertTriangle,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { useWhatsApp } from "~/hooks/useWhatsApp";
import { cn } from "~/lib/utils";
import type { WhatsAppConnectionStatus } from "~/types/whatsapp.interface";
import { Spinner } from "../ui/spinner";
import ConfirmDialog from "./ConfirmDialog";
import LoadingSpinner from "./LoadingSpinner";
import { toast } from "./Toaster";
import WhatsAppIcon from "./WhatsAppIcon";

const STATUS_LABEL: Record<WhatsAppConnectionStatus, string> = {
  connected: "Connected",
  initializing: "Connecting",
  authenticating: "Connecting",
  qr_required: "Waiting for QR scan",
  disconnected: "Disconnected",
  auth_failed: "Authentication failed",
};

const STATUS_TONE: Record<WhatsAppConnectionStatus, string> = {
  connected: "bg-green-100 text-green-700",
  initializing: "bg-amber-100 text-amber-700",
  authenticating: "bg-amber-100 text-amber-700",
  qr_required: "bg-blue-100 text-blue-700",
  disconnected: "bg-gray-200 text-textColor",
  auth_failed: "bg-red-100 text-red-700",
};

/**
 * WhatsApp account management: shows the backend's connection state and lets
 * the user link (QR scan), log out, or switch to another number. All state comes
 * from the backend — nothing here pretends to be connected.
 */
export default function WhatsAppAccount() {
  const { status, loading, action, error, connect, logout, changeNumber } =
    useWhatsApp({ poll: true });
  const [confirm, setConfirm] = useState<"logout" | "change-number" | null>(
    null,
  );

  if (loading && !status) return <LoadingSpinner />;

  const current: WhatsAppConnectionStatus = status?.status ?? "disconnected";
  const isWorking = current === "initializing" || current === "authenticating";

  const handleConnect = async () => {
    const result = await connect();
    if (isRejected(result)) toast.error(String(result.payload));
  };

  const handleConfirm = async () => {
    if (confirm === "logout") {
      const result = await logout();
      if (isRejected(result)) toast.error(String(result.payload));
      else toast.success("WhatsApp logged out");
    } else if (confirm === "change-number") {
      const result = await changeNumber();
      if (isRejected(result)) toast.error(String(result.payload));
      else toast.success("Scan the QR code with the new number");
    }
    setConfirm(null);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <section className="overflow-hidden rounded-xl border border-borderColor bg-white">
        {/* Title + status */}
        <header className="flex items-center justify-between gap-3 border-b border-borderColor px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#25D366]/15">
              <WhatsAppIcon size={22} className="text-[#25D366]" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-textColor">
                WhatsApp Account
              </span>
              <span className="text-xs text-textLightColor">
                Reports are sent from this number
              </span>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
              STATUS_TONE[current],
            )}
          >
            {STATUS_LABEL[current]}
          </span>
        </header>

        <div className="p-4">
          {/* CONNECTED */}
          {current === "connected" && status && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 size={20} />
                <span className="font-medium">Connected</span>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <span className="block text-xs uppercase tracking-wide text-textLightColor">
                  Number
                </span>
                <span className="block text-lg font-semibold text-textColor">
                  {status.displayNumber ?? "—"}
                </span>
                {status.name && (
                  <span className="block text-sm text-textLightColor">
                    {status.name}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={!!action}
                  onClick={() => setConfirm("change-number")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-borderColor px-4 py-2 text-sm font-medium text-textColor hover:bg-gray-50 disabled:opacity-50"
                >
                  <Smartphone size={16} /> Change Number
                </button>
                <button
                  type="button"
                  disabled={!!action}
                  onClick={() => setConfirm("logout")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-deleteButtonColor px-4 py-2 text-sm font-medium text-white hover:bg-deleteButtonColor/90 disabled:opacity-50"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}

          {/* WAITING FOR QR SCAN */}
          {current === "qr_required" && (
            <div className="flex flex-col items-center gap-4 text-center">
              {status?.qr ? (
                <img
                  src={status.qr}
                  alt="WhatsApp login QR code"
                  className="size-64 rounded-lg border border-borderColor p-2"
                />
              ) : (
                <div className="flex size-64 items-center justify-center">
                  <Spinner className="size-8 text-textLightColor" />
                </div>
              )}
              <ol className="w-full list-decimal space-y-1 pl-5 text-left text-sm text-textColor">
                <li>Open WhatsApp on the phone you want to send from</li>
                <li>
                  Go to <b>Settings → Linked devices → Link a device</b>
                </li>
                <li>Scan this QR code</li>
              </ol>
              <p className="text-xs text-textLightColor">
                The QR code refreshes automatically.
              </p>
            </div>
          )}

          {/* STARTING / LOGGING IN */}
          {isWorking && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Spinner className="size-8 text-textLightColor" />
              <span className="text-sm text-textColor">
                {current === "authenticating"
                  ? "Logging in to WhatsApp…"
                  : "Starting WhatsApp…"}
              </span>
              {status?.lastError && (
                <span className="text-xs text-textLightColor">
                  {status.lastError}
                </span>
              )}
            </div>
          )}

          {/* NOT CONNECTED */}
          {(current === "disconnected" || current === "auth_failed") && (
            <div className="flex flex-col gap-4">
              {status?.lastError ? (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>{status.lastError}</span>
                </div>
              ) : (
                <p className="text-sm text-textLightColor">
                  No WhatsApp account is linked. Connect one to send reports to
                  Poshak Leaders.
                </p>
              )}
              <button
                type="button"
                disabled={action === "connect"}
                onClick={handleConnect}
                className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1fb857] disabled:opacity-60"
              >
                {action === "connect" ? (
                  <>
                    <Spinner /> Connecting…
                  </>
                ) : (
                  <>
                    {status?.hasSession ? (
                      <RefreshCw size={16} />
                    ) : (
                      <WhatsAppIcon size={18} />
                    )}
                    {status?.hasSession ? "Reconnect" : "Connect WhatsApp"}
                  </>
                )}
              </button>
            </div>
          )}

          {error && !status && (
            <p className="mt-3 text-sm text-errorColor">{error}</p>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirm === "logout"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Log out of WhatsApp?"
        description="Reports can't be sent until a WhatsApp account is linked again."
        confirmText="Logout"
        loadingText="Logging out…"
        loading={action === "logout"}
        destructive
        onConfirm={handleConfirm}
      />
      <ConfirmDialog
        open={confirm === "change-number"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Change WhatsApp number?"
        description={
          <>
            {status?.displayNumber ?? "The current number"} will be logged out
            and a new QR code will be shown. Scan it with the phone of the new
            number.
          </>
        }
        confirmText="Change Number"
        loadingText="Switching…"
        loading={action === "change-number"}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

// createAsyncThunk results: rejected actions carry the error message as payload.
function isRejected(result: {
  type: string;
  payload?: unknown;
}): boolean {
  return result.type.endsWith("/rejected");
}
