import { ABSENT_MEMBER, PRESENT_MEMBER } from "~/constant/constant";
import { localJsonStorageService } from "~/lib/localStorage";

/**
 * The queue of not-yet-synced present/absent marks.
 *
 * Kept in memory as Sets and flushed to localStorage on a debounce. Marking
 * attendance used to JSON.parse both queues, mutate them and JSON.stringify them
 * back on *every tap* — with a few hundred members already marked, that ran on
 * the main thread between the tap and the UI updating, which is what made the
 * green/red buttons feel sluggish. Reads are now O(1) and the disk write happens
 * once the taps stop.
 */
const FLUSH_DELAY_MS = 400;

let present: Set<number> | null = null;
let absent: Set<number> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function load() {
  if (present && absent) return;
  present = new Set(localJsonStorageService.getItem<number[]>(PRESENT_MEMBER) || []);
  absent = new Set(localJsonStorageService.getItem<number[]>(ABSENT_MEMBER) || []);
}

export function flushPendingAttendance() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!present || !absent) return;
  localJsonStorageService.setItem(PRESENT_MEMBER, Array.from(present));
  localJsonStorageService.setItem(ABSENT_MEMBER, Array.from(absent));
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushPendingAttendance();
  }, FLUSH_DELAY_MS);
}

export function queuePresent(userId: number) {
  load();
  present!.add(userId);
  absent!.delete(userId);
  scheduleFlush();
}

export function queueAbsent(userId: number) {
  load();
  absent!.add(userId);
  present!.delete(userId);
  scheduleFlush();
}

export function getPendingPresent(): number[] {
  load();
  return Array.from(present!);
}

export function getPendingAbsent(): number[] {
  load();
  return Array.from(absent!);
}

export function hasPendingAttendance(): boolean {
  load();
  return present!.size > 0 || absent!.size > 0;
}

/** Called after a successful sync — the server now owns these marks. */
export function clearPendingAttendance() {
  load();
  present!.clear();
  absent!.clear();
  flushPendingAttendance();
}

// A tab close / backgrounded PWA must not lose marks that are still only in the
// debounce window.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingAttendance);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingAttendance();
  });
}
