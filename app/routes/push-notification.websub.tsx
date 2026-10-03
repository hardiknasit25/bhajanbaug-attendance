// Public WebSub callback for YouTube's hub: /push-notification/websub
// Resource route (no UI, no auth) — the hub must be able to call it.
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleNotificationRequest, handleVerification } from "~/lib/youtube-push/service.server";

// GET: verification of intent (echo hub.challenge).
export const loader = ({ request }: LoaderFunctionArgs) => handleVerification(request);

// POST: Atom notification for a new/updated/deleted video.
export const action = ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  return handleNotificationRequest(request);
};
