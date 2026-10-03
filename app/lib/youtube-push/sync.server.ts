// Notification -> videos.list fetch -> compare -> update CMS only when changed
// (ported from youtube-CMS-push-notification/src/sync.js).
import crypto from "node:crypto";
import { getState, logEvent, save } from "./db.server";
import { getVideos, listUploadIds, type YoutubeVideo } from "./youtube.server";

type ApplyResult = "created" | "updated" | "unchanged";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Applies the latest YouTube snippet to the CMS record.
function applySnippet(item: YoutubeVideo, source: string, { logCreate = true } = {}): ApplyResult {
  const state = getState();
  const s = item.snippet;
  const latest = s.description || "";
  const hash = sha256(latest);
  const now = new Date().toISOString();
  const existing = state.videos[item.id];

  if (!existing) {
    state.videos[item.id] = {
      youtubeVideoId: item.id,
      title: s.title,
      thumbnail: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || null,
      publishedAt: s.publishedAt,
      youtubeDescription: latest,
      youtubeDescriptionHash: hash,
      youtubeSyncedAt: now,
      descriptionChanges: 0,
      notes: "",
      deleted: false,
    };
    save();
    if (logCreate) logEvent("created", `Added "${s.title}" to CMS (${source})`, { videoId: item.id });
    return "created";
  }

  existing.title = s.title;
  existing.deleted = false;
  existing.youtubeSyncedAt = now;

  if (existing.youtubeDescriptionHash !== hash) {
    existing.previousDescription = existing.youtubeDescription;
    existing.youtubeDescription = latest;
    existing.youtubeDescriptionHash = hash;
    existing.descriptionChanges = (existing.descriptionChanges || 0) + 1;
    existing.descriptionUpdatedAt = now;
    save();
    logEvent("updated", `Description changed for "${s.title}" (${source})`, { videoId: item.id });
    return "updated";
  }

  save();
  return "unchanged";
}

export async function handleNotification(videoId: string, channelId: string) {
  const state = getState();
  // Ownership check: only accept notifications for the channel this CMS is mapped to.
  if (channelId !== state.channel.youtubeChannelId) {
    logEvent("ignored", `Notification for unmapped channel ${channelId}`, { videoId });
    return;
  }

  const known = state.videos[videoId];
  if (known) known.lastPushAt = new Date().toISOString();

  const [item] = await getVideos([videoId]);
  if (!item) {
    logEvent("warning", `videos.list returned nothing for ${videoId} (private/deleted?)`, { videoId });
    return;
  }
  if (item.snippet.channelId !== channelId) {
    logEvent("ignored", `Video ${videoId} does not belong to ${channelId}`, { videoId });
    return;
  }

  if (applySnippet(item, "push") === "unchanged") {
    logEvent("unchanged", `Push for "${item.snippet.title}" - description unchanged (title/other edit)`, {
      videoId,
    });
  }
}

export function markDeleted(videoId: string) {
  const v = getState().videos[videoId];
  if (!v) return;
  v.deleted = true;
  save();
  logEvent("deleted", `YouTube reported "${v.title}" deleted`, { videoId });
}

// Initial import / manual import of the channel's uploads.
export async function importChannel(max = Infinity) {
  const state = getState();
  const { channel, ids } = await listUploadIds(state.channel.youtubeChannelId!, max);
  state.channel.title = channel.snippet.title;
  save();
  const items = await getVideos(ids);
  const counts = { created: 0, updated: 0, unchanged: 0 };
  for (const item of items) counts[applySnippet(item, "import", { logCreate: false })]++;
  logEvent(
    "import",
    `Imported ${items.length} videos from "${channel.snippet.title}" ` +
      `(new ${counts.created}, changed ${counts.updated}, unchanged ${counts.unchanged})`
  );
  return counts;
}

// Re-check every known video (1 quota unit per 50 videos).
export async function reconcile() {
  const ids = Object.keys(getState().videos);
  if (!ids.length) return { checked: 0, changed: 0 };
  const items = await getVideos(ids);
  let changed = 0;
  for (const item of items) if (applySnippet(item, "reconcile") === "updated") changed++;
  logEvent("reconcile", `Checked ${items.length} videos, ${changed} description change(s) found`);
  return { checked: items.length, changed };
}
