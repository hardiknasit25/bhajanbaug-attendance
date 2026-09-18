import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "~/lib/utils";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  leaving?: boolean;
}

// Module-level emitter so `toast.success(...)` can be called from anywhere
// (thunks, event handlers) without threading React context around.
let emit: ((item: ToastItem) => void) | null = null;
let nextId = 0;

const push = (type: ToastType, message: string) =>
  emit?.({ id: ++nextId, type, message });

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

const AUTO_DISMISS_MS = 3000;
// Must match the animate-out duration below.
const EXIT_MS = 200;

/** Global toast outlet — mount once (in root). */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Enter/exit are done with tailwindcss-animate utilities rather than
  // framer-motion. The Toaster is mounted in root.tsx, so framer-motion was
  // being downloaded and parsed on every page load — including login — just to
  // fade a toast that appears a few times a session.
  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    timers.current.push(
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        EXIT_MS,
      ),
    );
  }, []);

  useEffect(() => {
    emit = (item) => {
      setToasts((prev) => [...prev, item]);
      timers.current.push(setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS));
    };
    return () => {
      emit = null;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg border bg-white px-4 py-3 shadow-lg",
            t.type === "success" ? "border-green-200" : "border-red-200",
            t.leaving
              ? "animate-out fade-out zoom-out-95 slide-out-to-top-4 duration-200 fill-mode-forwards"
              : "animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200",
          )}
        >
          {t.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 text-green-600" />
          ) : (
            <XCircle size={18} className="shrink-0 text-red-600" />
          )}
          <p className="text-sm font-medium text-textColor">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
