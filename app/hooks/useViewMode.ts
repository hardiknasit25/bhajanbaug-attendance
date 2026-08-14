import { useEffect, useState } from "react";

export type ViewMode = "card" | "table";

// Card/table view preference, remembered per page (localStorage). Defaults to
// "table"; the user's last choice (saved on every switch) wins after hydration.
export function useViewMode(pageKey: string) {
  const storageKey = `view-mode:${pageKey}`;
  const [viewMode, setViewModeState] = useState<ViewMode>("table");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "card" || saved === "table") setViewModeState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {
      // storage unavailable (private mode) — keep in-memory only
    }
  };

  return [viewMode, setViewMode] as const;
}
