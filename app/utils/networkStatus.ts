// App-wide network health, shown as a banner at the top of every screen.
//
// Three signals feed it:
//   * offline      -> the browser lost its connection (online/offline events)
//   * slow         -> the browser reports a 2G-class connection
//   * requestFailed -> an API call timed out (set from the axios interceptor,
//                     cleared by the next successful response or after a few
//                     seconds). Server errors / server down do NOT count.
//
// Module-level store (like the toast emitter) so the axios interceptor can
// report problems without React context.

export type NetworkProblem = "offline" | "slow" | null;

interface NetworkState {
  offline: boolean;
  slow: boolean;
  requestFailed: boolean;
}

type Listener = (problem: NetworkProblem) => void;

// How long a failed request keeps the banner up when nothing else succeeds.
const REQUEST_FAILURE_MS = 8_000;

const state: NetworkState = { offline: false, slow: false, requestFailed: false };
const listeners = new Set<Listener>();
let requestFailureTimer: ReturnType<typeof setTimeout> | null = null;

export const getNetworkProblem = (): NetworkProblem => {
  if (state.offline) return "offline";
  if (state.slow || state.requestFailed) return "slow";
  return null;
};

const notify = () => {
  const problem = getNetworkProblem();
  listeners.forEach((listener) => listener(problem));
};

const update = (patch: Partial<NetworkState>) => {
  const before = getNetworkProblem();
  Object.assign(state, patch);
  if (getNetworkProblem() !== before) notify();
};

/** An API call timed out — likely a weak connection. */
export const reportRequestFailure = () => {
  if (requestFailureTimer) clearTimeout(requestFailureTimer);
  requestFailureTimer = setTimeout(
    () => update({ requestFailed: false }),
    REQUEST_FAILURE_MS,
  );
  update({ requestFailed: true });
};

/** An API call succeeded — the connection is working again. */
export const reportRequestSuccess = () => {
  if (!state.requestFailed) return;
  if (requestFailureTimer) clearTimeout(requestFailureTimer);
  requestFailureTimer = null;
  update({ requestFailed: false });
};

/** Hides the banner until the next problem is detected. */
export const dismissNetworkProblem = () => {
  if (requestFailureTimer) clearTimeout(requestFailureTimer);
  requestFailureTimer = null;
  update({ requestFailed: false, slow: false });
};

// Network Information API (Chrome / Android only; absent elsewhere).
type NetworkInformation = EventTarget & { effectiveType?: string };
const getConnection = (): NetworkInformation | undefined =>
  typeof navigator !== "undefined"
    ? (navigator as Navigator & { connection?: NetworkInformation }).connection
    : undefined;

const isSlowConnection = () => {
  const type = getConnection()?.effectiveType;
  return type === "slow-2g" || type === "2g";
};

let browserListenersAttached = false;
const attachBrowserListeners = () => {
  if (browserListenersAttached || typeof window === "undefined") return;
  browserListenersAttached = true;

  state.offline = !navigator.onLine;
  state.slow = isSlowConnection();

  window.addEventListener("online", () => update({ offline: false }));
  window.addEventListener("offline", () => update({ offline: true }));
  getConnection()?.addEventListener("change", () =>
    update({ slow: isSlowConnection() }),
  );
};

/** Subscribes to network problems; returns the unsubscribe function. */
export const subscribeNetworkProblem = (listener: Listener) => {
  attachBrowserListeners();
  listeners.add(listener);
  listener(getNetworkProblem());
  return () => {
    listeners.delete(listener);
  };
};
