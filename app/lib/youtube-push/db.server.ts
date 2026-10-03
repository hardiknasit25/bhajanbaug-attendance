// Tiny JSON-file store (ported from youtube-CMS-push-notification/src/db.js).
// Good enough for a single-instance test; swap for a real DB later.
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.server";

const MAX_EVENTS = 200;

export type VideoRecord = {
  youtubeVideoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string;
  youtubeDescription: string;
  youtubeDescriptionHash: string;
  youtubeSyncedAt: string;
  descriptionChanges: number;
  descriptionUpdatedAt?: string;
  previousDescription?: string;
  lastPushAt?: string;
  notes: string;
  deleted: boolean;
};

export type PushEvent = {
  at: string;
  type: string;
  message: string;
  videoId?: string;
};

export type Subscription = {
  status: string;
  topic: string | null;
  callback: string | null;
  leaseSeconds: number | null;
  expiresAt: string | null;
  lastRequestAt: string | null;
};

export type PushState = {
  channel: { youtubeChannelId: string | null; title: string | null };
  subscription: Subscription;
  videos: Record<string, VideoRecord>;
  events: PushEvent[];
};

const empty = (): PushState => ({
  channel: { youtubeChannelId: config.channelId, title: null },
  subscription: {
    status: "none",
    topic: null,
    callback: null,
    leaseSeconds: null,
    expiresAt: null,
    lastRequestAt: null,
  },
  videos: {},
  events: [],
});

function load(): PushState {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(config.dbFile, "utf8")) };
  } catch {
    return empty();
  }
}

// Kept on globalThis so dev HMR reloads of this module share one state.
const g = globalThis as typeof globalThis & {
  __ytPushDb?: { state: PushState; saveTimer: NodeJS.Timeout | null };
};
const store = (g.__ytPushDb ??= { state: load(), saveTimer: null });

function writeNow() {
  if (store.saveTimer) clearTimeout(store.saveTimer);
  store.saveTimer = null;
  fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
  const tmp = config.dbFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(store.state, null, 2));
  fs.renameSync(tmp, config.dbFile);
}

// Debounced: many changes in a burst (import, full sweep) result in one write.
// On Vercel the function can be frozen right after responding, so write immediately.
export function save() {
  if (process.env.VERCEL) return writeNow();
  if (!store.saveTimer) store.saveTimer = setTimeout(writeNow, 500);
}

export const getState = () => store.state;

export function logEvent(type: string, message: string, extra: { videoId?: string } = {}) {
  const { events } = store.state;
  events.unshift({ at: new Date().toISOString(), type, message, ...extra });
  events.length = Math.min(events.length, MAX_EVENTS);
  save();
  console.log(`[yt-push:${type}] ${message}`);
}
