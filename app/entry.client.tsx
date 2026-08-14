import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { initInstallPrompt } from "~/utils/installPrompt";

// Capture the PWA install event before hydration — Chrome can fire it earlier
// than any React component mounts, and a late listener misses it entirely.
initInstallPrompt();

// Custom client entry WITHOUT <StrictMode>: React Router's default entry wraps
// the app in StrictMode, which double-mounts components in development and made
// every API call fire twice. Production behavior is unchanged either way.
startTransition(() => {
  hydrateRoot(document, <HydratedRouter />);
});
