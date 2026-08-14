import { useEffect, useRef } from "react";

// Keeps a page's search text in localStorage: restores the saved value on
// mount and saves every change — so navigating away (or reloading) and coming
// back shows the list filtered exactly as the user left it.
export function usePersistedSearch(
  pageKey: string,
  searchText: string,
  setSearchText: (value: string) => void
) {
  const storageKey = `search:${pageKey}`;
  const restored = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved !== null && saved !== searchText) setSearchText(saved);
    } catch {
      // storage unavailable — search just starts empty
    }
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(storageKey, searchText);
    } catch {
      // storage unavailable — nothing to persist
    }
  }, [searchText, storageKey]);
}
