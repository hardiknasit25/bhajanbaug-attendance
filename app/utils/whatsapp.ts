// Opens a WhatsApp chat with a pre-filled message (the user taps Send).

const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /android|iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Desktop browsers block `window.open` once an `await` has used up the click,
 * so a blank tab is opened synchronously in the click handler and pointed at
 * WhatsApp Web afterwards. Returns null on phones (they switch to the app).
 */
export function prepareWhatsAppWindow(): Window | null {
  if (isMobileDevice()) return null;
  const win = window.open("", "_blank");
  if (win) win.opener = null;
  return win;
}

/**
 * Opens `phone`'s chat with `message`. `phone` is digits only with the
 * country code ("919876543210"). Pass the tab from prepareWhatsAppWindow().
 */
export function openWhatsAppChat(
  phone: string,
  message: string,
  preparedWindow: Window | null = null,
) {
  const encoded = encodeURIComponent(message);
  const webUrl = `https://wa.me/${phone}?text=${encoded}`;

  if (!isMobileDevice()) {
    // Desktop has no whatsapp:// handler — use WhatsApp Web.
    if (preparedWindow && !preparedWindow.closed) {
      preparedWindow.location.href = webUrl;
    } else {
      const opened = window.open(webUrl, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = webUrl;
    }
    return;
  }

  // Phones: hand off to the installed app via its scheme, so this screen stays
  // where it was. If WhatsApp isn't installed nothing happens and the page
  // stays visible — then fall back to wa.me after a short grace period.
  let handedOff = false;
  const markHandedOff = () => {
    if (document.hidden) handedOff = true;
  };
  document.addEventListener("visibilitychange", markHandedOff);
  window.location.href = `whatsapp://send?phone=${phone}&text=${encoded}`;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", markHandedOff);
    if (!handedOff && !document.hidden) window.location.href = webUrl;
  }, 1500);
}
