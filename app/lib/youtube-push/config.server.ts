// Config for the YouTube push-notification (WebSub) test page.
// Ported from youtube-CMS-push-notification/.env.example.
//
// react-router-serve does not load .env files, so values are read from process.env and,
// as a fallback, from a `.env` file in the working directory (handy on the host).
import fs from "node:fs";
import path from "node:path";

function loadDotEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadDotEnv();

export const CALLBACK_PATH = "/push-notification/websub";

export const config = {
  // Public HTTPS base URL of this frontend that YouTube's hub can reach. No trailing slash.
  // If empty, the origin of the request that clicks "Subscribe" is used instead.
  publicUrl: (process.env.YT_PUSH_PUBLIC_URL || "").replace(/\/+$/, ""),
  channelId: process.env.YT_PUSH_CHANNEL_ID || "UCM7AtTZrzIN9Njkvbp-5v3Q",
  apiKey: process.env.YT_PUSH_API_KEY || "",
  // Shared with the hub; used to verify X-Hub-Signature on notifications.
  secret: process.env.YT_PUSH_WEBSUB_SECRET || "",
  // Subscribe automatically on server start / renew the lease hourly (needs publicUrl).
  autoSubscribe: process.env.YT_PUSH_AUTO_SUBSCRIBE !== "false",
  // On Vercel only /tmp is writable (and it is per-instance and temporary).
  dbFile:
    process.env.YT_PUSH_DB_FILE ||
    (process.env.VERCEL
      ? "/tmp/youtube-push/db.json"
      : path.join(process.cwd(), "storage", "youtube-push", "db.json")),
};
