import { useEffect, useRef, useState } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useRevalidator,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaArgs,
} from "react-router";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import { Button } from "~/components/ui/button";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";
import { getState, save } from "~/lib/youtube-push/db.server";
import {
  callbackUrl,
  listVideos,
  rememberOrigin,
  subscribe,
  topic,
} from "~/lib/youtube-push/service.server";
import { importChannel, reconcile } from "~/lib/youtube-push/sync.server";

export function meta({}: MetaArgs) {
  return [
    { title: "YouTube Push Notification" },
    { name: "description", content: "YouTube description sync via WebSub push notifications" },
  ];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!getTokenFromRequest(request)) return redirect("/login");
  rememberOrigin(request);
  const q = (new URL(request.url).searchParams.get("q") || "").trim().toLowerCase();
  const s = getState();
  return {
    channel: s.channel,
    subscription: s.subscription,
    callbackUrl: callbackUrl(),
    topic,
    ...listVideos(q),
    events: s.events.slice(0, 50),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (!getTokenFromRequest(request)) return data({ error: "Not logged in" }, { status: 401 });
  rememberOrigin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    switch (intent) {
      case "subscribe":
      case "unsubscribe":
        return { ok: true, result: await subscribe(intent) };
      case "import":
        return { ok: true, result: await importChannel() };
      case "reconcile":
        return { ok: true, result: await reconcile() };
      case "notes": {
        const v = getState().videos[String(form.get("id"))];
        if (!v) return data({ error: "Video not found" }, { status: 404 });
        v.notes = String(form.get("notes") ?? "");
        save();
        return { ok: true };
      }
      default:
        return data({ error: `Unknown intent ${intent}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return data({ error: message }, { status: 500 });
  }
};

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

const ACTIONS = [
  { intent: "subscribe", label: "Subscribe to push", variant: "default" },
  { intent: "import", label: "Import videos", variant: "outline" },
  { intent: "reconcile", label: "Reconcile now", variant: "outline" },
  { intent: "unsubscribe", label: "Unsubscribe", variant: "outline" },
] as const;

function ActionButton({ intent, label, variant }: (typeof ACTIONS)[number]) {
  const fetcher = useFetcher<{ error?: string }>();
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.error) alert(fetcher.data.error);
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <Button type="submit" size="sm" variant={variant} disabled={busy}>
        {busy ? "Working…" : label}
      </Button>
    </fetcher.Form>
  );
}

function NotesField({ id, notes }: { id: string; notes: string }) {
  const fetcher = useFetcher();
  return (
    <textarea
      rows={2}
      defaultValue={notes}
      placeholder="CMS notes…"
      className="mt-2 w-full rounded-md border border-gray-300 p-2 text-sm"
      onBlur={(e) => {
        if (e.target.value !== notes) {
          fetcher.submit({ intent: "notes", id, notes: e.target.value }, { method: "post" });
        }
      }}
    />
  );
}

export default function PushNotificationPage() {
  const s = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Live-ish updates: re-run the loader every 5s unless the user is typing.
  useEffect(() => {
    const id = setInterval(() => {
      const typing = document.activeElement?.matches("textarea, input");
      if (!typing && revalidator.state === "idle" && document.visibilityState === "visible") {
        revalidator.revalidate();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [revalidator]);

  const onSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => setSearchParams(value.trim() ? { q: value.trim() } : {}, { replace: true }),
      300
    );
  };

  const sub = s.subscription;
  const subColor =
    sub.status === "active"
      ? "text-green-700 border-green-700"
      : sub.status.includes("pending")
        ? "text-amber-700 border-amber-700"
        : "text-gray-600 border-gray-400";

  const count =
    s.matchingVideos === s.totalVideos
      ? `(${s.totalVideos}${s.totalVideos > s.videos.length ? `, showing ${s.videos.length} most recent` : ""})`
      : `(${s.matchingVideos} of ${s.totalVideos} match)`;

  return (
    <LayoutWrapper headerConfigs={{ title: "YouTube Push Notification" }} showTab={false} className="p-4">
      <div className="mb-4 flex flex-col gap-3">
        <div className="text-sm text-textLightColor">
          {s.channel.title || "Channel"} ·{" "}
          <code className="break-all text-xs">{s.channel.youtubeChannelId}</code>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <ActionButton key={a.intent} {...a} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-base font-semibold">
            Videos <span className="text-xs font-normal text-textLightColor">{count}</span>
          </h2>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search title, description or video ID…"
            className="mb-2 w-full rounded-md border border-gray-300 p-2 text-sm"
          />
          {s.videos.length ? (
            s.videos.map((v) => (
              <div
                key={v.youtubeVideoId}
                className="grid gap-3 border-t border-gray-200 py-3 first:border-t-0 sm:grid-cols-[160px_1fr]"
              >
                {v.thumbnail ? <img src={v.thumbnail} alt="" className="w-full rounded-md sm:w-40" /> : <div />}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    <a
                      href={`https://www.youtube.com/watch?v=${v.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {v.title}
                    </a>
                    {v.deleted && (
                      <span className="ml-2 rounded-full border px-2 text-xs font-normal">deleted</span>
                    )}
                  </h3>
                  <div className="text-xs text-textLightColor">
                    Synced {fmt(v.youtubeSyncedAt)} · description changes: {v.descriptionChanges || 0}
                    {v.descriptionUpdatedAt && ` · last change ${fmt(v.descriptionUpdatedAt)}`}
                  </div>
                  <pre className="my-2 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-md bg-gray-50 p-2 font-mono text-xs">
                    {v.youtubeDescription || "(empty description)"}
                  </pre>
                  <NotesField id={v.youtubeVideoId} notes={v.notes} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-textLightColor">No videos yet. Click “Import videos”.</p>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="mb-2 text-base font-semibold">Push subscription</h2>
            <span className={`inline-block rounded-full border px-2 text-xs ${subColor}`}>{sub.status}</span>
            <p className="mt-2 text-xs text-textLightColor">Expires: {fmt(sub.expiresAt)}</p>
            <p className="mt-2 text-xs text-textLightColor">
              Callback:
              <br />
              <code className="break-all">{s.callbackUrl || "YT_PUSH_PUBLIC_URL not set"}</code>
            </p>
            <p className="mt-2 text-xs text-textLightColor">
              Topic:
              <br />
              <code className="break-all">{s.topic}</code>
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-base font-semibold">Activity</h2>
            {s.events.length ? (
              s.events.map((e, i) => (
                <div key={`${e.at}-${i}`} className="border-t border-gray-200 py-1.5 text-sm first:border-t-0">
                  <b className="text-[11px] uppercase tracking-wide">{e.type}</b>{" "}
                  <span className="text-xs text-textLightColor">{fmt(e.at)}</span>
                  <div className="break-words">{e.message}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-textLightColor">No activity yet.</p>
            )}
          </div>
        </aside>
      </div>
    </LayoutWrapper>
  );
}
