// YouTube Data API v3 helpers (API-key based; read-only public metadata)
// (ported from youtube-CMS-push-notification/src/youtube.js).
import { config } from "./config.server";

const API = "https://www.googleapis.com/youtube/v3";

export type YoutubeVideo = {
  id: string;
  snippet: {
    channelId: string;
    title: string;
    description?: string;
    publishedAt: string;
    thumbnails?: Record<string, { url: string }>;
  };
};

async function call(endpoint: string, params: Record<string, string | number>) {
  if (!config.apiKey) throw new Error("YT_PUSH_API_KEY is not set");
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("key", config.apiKey);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(`YouTube API ${endpoint}: ${body.error?.message || res.status}`);
  return body;
}

// videos.list(part=snippet) — 1 quota unit per call, up to 50 ids.
export async function getVideos(ids: string[]): Promise<YoutubeVideo[]> {
  const out: YoutubeVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const body = await call("videos", {
      part: "snippet",
      id: ids.slice(i, i + 50).join(","),
      maxResults: 50,
    });
    out.push(...(body.items || []));
  }
  return out;
}

export async function getChannel(channelId: string) {
  const body = await call("channels", { part: "snippet,contentDetails", id: channelId });
  const ch = body.items?.[0];
  if (!ch) throw new Error(`Channel ${channelId} not found`);
  return ch;
}

// Returns video ids from the channel's "uploads" playlist (newest first).
export async function listUploadIds(channelId: string, max = Infinity) {
  const ch = await getChannel(channelId);
  const playlistId = ch.contentDetails.relatedPlaylists.uploads;
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const body = await call("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: Math.min(50, max - ids.length),
      ...(pageToken ? { pageToken } : {}),
    });
    ids.push(...body.items.map((it: any) => it.contentDetails.videoId));
    pageToken = body.nextPageToken;
  } while (pageToken && ids.length < max);
  return { channel: ch, ids };
}
