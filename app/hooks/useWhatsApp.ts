import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "~/store/hooks";
import {
  changeWhatsAppNumber,
  connectWhatsApp,
  fetchWhatsAppStatus,
  logoutWhatsApp,
} from "~/store/slice/whatsappSlice";

// While the backend is starting / showing a QR / logging in, the state changes
// on its own (QR refresh, phone scanned), so it is polled quickly. Otherwise a
// slow poll catches drops (e.g. the device was removed from the phone).
const FAST_POLL_MS = 2_000;
const SLOW_POLL_MS = 15_000;

/**
 * WhatsApp connection state from the backend. With `poll`, keeps it fresh
 * while the calling screen is mounted.
 */
export const useWhatsApp = ({ poll = false }: { poll?: boolean } = {}) => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.whatsapp);
  const current = state.status?.status;

  useEffect(() => {
    dispatch(fetchWhatsAppStatus());
  }, [dispatch]);

  useEffect(() => {
    if (!poll) return;
    const transitional =
      current === "initializing" ||
      current === "qr_required" ||
      current === "authenticating";
    const timer = setInterval(
      () => dispatch(fetchWhatsAppStatus()),
      transitional ? FAST_POLL_MS : SLOW_POLL_MS,
    );
    return () => clearInterval(timer);
  }, [dispatch, poll, current]);

  return {
    ...state,
    connected: !!state.status?.connected,
    refresh: () => dispatch(fetchWhatsAppStatus()),
    connect: () => dispatch(connectWhatsApp()),
    logout: () => dispatch(logoutWhatsApp()),
    changeNumber: () => dispatch(changeWhatsAppNumber()),
  };
};
