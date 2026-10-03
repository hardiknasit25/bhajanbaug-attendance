// PubSubHubbub / WebSub helpers for YouTube channel feeds
// (ported from youtube-CMS-push-notification/src/websub.js).
import crypto from "node:crypto";

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";
export const DEFAULT_LEASE_SECONDS = 432000; // 5 days; must be renewed before it expires

export const topicFor = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

export async function requestSubscription({
  mode = "subscribe",
  callback,
  topic,
  secret,
}: {
  mode?: "subscribe" | "unsubscribe";
  callback: string;
  topic: string;
  secret?: string;
}) {
  const form = new URLSearchParams({
    "hub.mode": mode,
    "hub.callback": callback,
    "hub.topic": topic,
    "hub.verify": "async",
    "hub.lease_seconds": String(DEFAULT_LEASE_SECONDS),
  });
  if (secret) form.set("hub.secret", secret);

  const res = await fetch(HUB_URL, { method: "POST", body: form });
  // 202 Accepted = hub will now call our callback with a GET to verify intent.
  if (res.status !== 202 && res.status !== 204) {
    throw new Error(`Hub responded ${res.status}: ${await res.text()}`);
  }
  return res.status;
}

// The hub signs the raw body with HMAC-SHA1(secret) in "X-Hub-Signature: sha1=<hex>".
export function verifySignature(rawBody: Buffer, header: string | null, secret: string) {
  if (!secret) return true;
  if (!header) return false;
  const [algo, sig] = header.split("=");
  if (!["sha1", "sha256"].includes(algo) || !sig) return false;
  const expected = crypto.createHmac(algo, secret).update(rawBody).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Extracts video/channel ids from the Atom payload. The notification is only a trigger;
// the authoritative description is fetched separately via videos.list.
export function parseNotification(xml: string) {
  const tag = (src: string, name: string) =>
    src.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];

  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, e]) => ({
      videoId: tag(e, "yt:videoId"),
      channelId: tag(e, "yt:channelId"),
      title: tag(e, "title"),
      updated: tag(e, "updated"),
    }))
    .filter((e): e is { videoId: string; channelId: string; title: string | undefined; updated: string | undefined } =>
      Boolean(e.videoId && e.channelId)
    );

  const deleted = [...xml.matchAll(/<at:deleted-entry[^>]*ref="yt:video:([^"]+)"/g)].map(
    ([, id]) => id
  );

  return { entries, deleted };
}
