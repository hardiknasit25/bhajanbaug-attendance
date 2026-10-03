// WebSub callback handling, subscribe/renew and listing
// (ported from youtube-CMS-push-notification/src/server.js).
import { CALLBACK_PATH, config } from "./config.server";
import { getState, logEvent, save, type VideoRecord } from "./db.server";
import { handleNotification, markDeleted } from "./sync.server";
import { parseNotification, requestSubscription, topicFor, verifySignature } from "./websub.server";

const HOUR = 60 * 60 * 1000;

export const topic = topicFor(config.channelId);

// Base URL used for the hub callback. Falls back to the origin seen on the last admin request
// when YT_PUSH_PUBLIC_URL is not set (behind a proxy, x-forwarded-* headers are honoured).
const g = globalThis as typeof globalThis & { __ytPushOrigin?: string; __ytPushTimer?: NodeJS.Timeout };

export function rememberOrigin(request: Request) {
  if (config.publicUrl) return;
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host") || url.host;
  g.__ytPushOrigin = `${proto}://${host}`;
}

const publicUrl = () => config.publicUrl || g.__ytPushOrigin || "";
export const callbackUrl = () => (publicUrl() ? `${publicUrl()}${CALLBACK_PATH}` : null);

// 1) Verification of intent: hub sends GET with hub.challenge; echo it back.
export function handleVerification(request: Request) {
  const q = new URL(request.url).searchParams;
  const mode = q.get("hub.mode");
  const reqTopic = q.get("hub.topic");
  const challenge = q.get("hub.challenge");
  const lease = Number(q.get("hub.lease_seconds")) || null;

  if (!challenge || reqTopic !== topic) {
    logEvent("warning", `Rejected verification for topic ${reqTopic}`);
    return new Response("Not found", { status: 404 });
  }

  const sub = getState().subscription;
  if (mode === "subscribe") {
    Object.assign(sub, {
      status: "active",
      topic: reqTopic,
      callback: callbackUrl(),
      leaseSeconds: lease,
      expiresAt: lease ? new Date(Date.now() + lease * 1000).toISOString() : null,
    });
    logEvent("subscribed", `Hub verified subscription (lease ${lease}s)`);
  } else if (mode === "unsubscribe") {
    Object.assign(sub, { status: "none", expiresAt: null });
    logEvent("unsubscribed", "Hub verified unsubscribe");
  }
  save();
  return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

// 2) Notifications: hub POSTs the Atom entry. Uses the raw body for signature checking.
export async function handleNotificationRequest(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer());

  // Still answer 2xx on a bad signature so the hub doesn't retry a forged/stale request.
  if (!verifySignature(raw, request.headers.get("X-Hub-Signature"), config.secret)) {
    logEvent("warning", "Dropped notification with invalid X-Hub-Signature");
    return new Response(null, { status: 204 });
  }

  const xml = raw.toString("utf8");
  const { entries, deleted } = parseNotification(xml);
  const summary = entries
    .map((e) => `${e.videoId} "${e.title}" updated ${e.updated}`)
    .concat(deleted.map((id) => `${id} deleted`));
  logEvent("push", `Notification from YouTube: ${summary.join("; ") || "(no entries)"}`);
  console.log(xml);

  // Processed before responding: serverless hosts (Vercel) may freeze the function once the
  // response is sent. videos.list is fast, well within the hub's timeout.
  deleted.forEach(markDeleted);
  await Promise.all(
    entries.map((e) =>
      handleNotification(e.videoId, e.channelId).catch((err) =>
        logEvent("error", `Sync failed for ${e.videoId}: ${err.message}`, { videoId: e.videoId })
      )
    )
  );

  return new Response(null, { status: 204 });
}

export async function subscribe(mode: "subscribe" | "unsubscribe") {
  const callback = callbackUrl();
  if (!callback?.startsWith("https://")) {
    throw new Error(`Callback must be a public https:// URL (got ${callback ?? "none"}). Set YT_PUSH_PUBLIC_URL.`);
  }
  const status = await requestSubscription({ mode, callback, topic, secret: config.secret });
  Object.assign(getState().subscription, {
    status: `${mode}-pending`,
    lastRequestAt: new Date().toISOString(),
  });
  save();
  logEvent("hub", `${mode} request accepted by hub (HTTP ${status}); waiting for verification GET`);
  return status;
}

// Lease renewal: checked hourly so the push subscription never expires.
function renewIfNeeded() {
  if (!callbackUrl()) return;
  const { status, expiresAt } = getState().subscription;
  const expiringSoon = expiresAt && new Date(expiresAt).getTime() - Date.now() < 24 * HOUR;
  if (status !== "active" || expiringSoon) {
    subscribe("subscribe").catch((err) => logEvent("error", `Auto-subscribe failed: ${err.message}`));
  }
}

export function startBackgroundJobs() {
  if (g.__ytPushTimer || !config.autoSubscribe) return;
  getState().channel.youtubeChannelId = config.channelId;
  save();
  renewIfNeeded();
  g.__ytPushTimer = setInterval(renewIfNeeded, HOUR);
}

// The UI gets at most 100 videos (most recently changed/published first),
// optionally filtered by a search on title, description or video id.
export function listVideos(q: string) {
  const all = Object.values(getState().videos);
  const matches = q
    ? all.filter(
        (v) =>
          v.youtubeVideoId.toLowerCase() === q ||
          v.title.toLowerCase().includes(q) ||
          v.youtubeDescription.toLowerCase().includes(q)
      )
    : all;
  const key = (v: VideoRecord) => v.descriptionUpdatedAt || v.publishedAt || "";
  matches.sort((a, b) => key(b).localeCompare(key(a)));
  return { totalVideos: all.length, matchingVideos: matches.length, videos: matches.slice(0, 100) };
}

startBackgroundJobs();
