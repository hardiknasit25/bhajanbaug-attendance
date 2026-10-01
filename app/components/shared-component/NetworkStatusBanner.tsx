import { WifiOff, X } from "lucide-react";
import { useNetworkProblem } from "~/hooks/useNetworkProblem";
import { cn } from "~/lib/utils";
import { dismissNetworkProblem } from "~/utils/networkStatus";

/** Global banner pinned to the top of the screen while the connection is bad. */
export function NetworkStatusBanner() {
  const problem = useNetworkProblem();
  if (!problem) return null;

  const offline = problem === "offline";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed inset-x-0 top-0 z-[110] flex items-center justify-center gap-2 px-10 py-2 text-center text-sm font-medium text-white shadow-md",
        "animate-in fade-in slide-in-from-top-2 duration-200",
        offline ? "bg-red-600" : "bg-amber-600",
      )}
    >
      <WifiOff size={16} className="shrink-0" aria-hidden="true" />
      <span>
        {offline
          ? "No internet connection. Please try again."
          : "Low internet connection. Please try again."}
      </span>
      {/* Offline can't be dismissed: it clears itself when back online. */}
      {!offline && (
        <button
          type="button"
          onClick={dismissNetworkProblem}
          aria-label="Dismiss"
          className="absolute right-3 rounded-full p-1 hover:bg-white/20"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
