import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "~/lib/utils";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
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

/** Global toast outlet — mount once (in root). */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    emit = (item) => {
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, AUTO_DISMISS_MS);
    };
    return () => {
      emit = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg border bg-white px-4 py-3 shadow-lg",
              t.type === "success" ? "border-green-200" : "border-red-200",
            )}
            onClick={() =>
              setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }
          >
            {t.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-green-600" />
            ) : (
              <XCircle size={18} className="shrink-0 text-red-600" />
            )}
            <p className="text-sm font-medium text-textColor">{t.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
