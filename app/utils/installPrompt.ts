import { useEffect, useState } from "react";
import { isPWAInstalled } from "./pwa";

// Single app-wide capture of Chrome's `beforeinstallprompt` event. The event
// fires once per page load (before most components mount), so it is stored at
// module level and components subscribe to availability changes — this lets
// the drawer's "Install App" button work even though the drawer mounts late.

// Once the user closes the install banner it never auto-shows again.
const DISMISS_KEY = "pwa-install-banner-dismissed";

let deferredPrompt: any = null;
let initialized = false;
const listeners = new Set<(available: boolean) => void>();

function notify(available: boolean) {
  listeners.forEach((listener) => listener(available));
}

// Called from entry.client.tsx BEFORE React hydrates — Chrome can fire
// `beforeinstallprompt` earlier than any component mounts, and a listener
// registered late simply misses the event (no button, no banner).
export function initInstallPrompt() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    notify(true);
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify(false);
  });
}

export function isInstallAvailable() {
  return !!deferredPrompt;
}

// Opens the native browser install dialog. Resolves with the user's choice.
export async function promptInstall(): Promise<"accepted" | "dismissed" | null> {
  if (!deferredPrompt) return null;
  const prompt = deferredPrompt;
  // A deferred prompt can only be used once.
  deferredPrompt = null;
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  notify(false);
  return outcome as "accepted" | "dismissed";
}

export function isBannerDismissed() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissBannerForever() {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // storage unavailable — banner will only be hidden for this session
  }
}

// React hook: whether the app can currently be installed (event captured and
// not already running as an installed PWA).
export function useInstallAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    initInstallPrompt();
    if (isPWAInstalled()) return;
    setAvailable(isInstallAvailable());
    listeners.add(setAvailable);
    return () => {
      listeners.delete(setAvailable);
    };
  }, []);

  return available;
}
