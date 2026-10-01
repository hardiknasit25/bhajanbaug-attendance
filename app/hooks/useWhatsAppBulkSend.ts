import { useCallback, useEffect, useRef, useState } from "react";
import {
  getApiErrorMessage,
  whatsappService,
} from "~/services/whatsappService";
import type {
  BulkSendJob,
  WhatsAppReportSelection,
} from "~/types/whatsapp.interface";

const POLL_MS = 1_500;

/**
 * Tracks the backend "send to all Poshak Leaders" job. The job runs on the
 * server one leader at a time; this hook starts it and polls its progress.
 * On mount it re-attaches to a job that is still running (e.g. after a page
 * refresh), so a second run can't be started by accident.
 */
export const useWhatsAppBulkSend = ({ enabled }: { enabled: boolean }) => {
  const [job, setJob] = useState<BulkSendJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Guards against rapid double clicks before `starting` re-renders.
  const startingRef = useRef(false);

  const isRunning = job?.status === "running";

  // Re-attach to a running job.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    whatsappService
      .getLatestJob()
      .then((res) => {
        const latest = res?.data as BulkSendJob | null;
        if (active && latest?.status === "running") setJob(latest);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [enabled]);

  // Poll while running.
  useEffect(() => {
    if (!job || job.status !== "running") return;
    const jobId = job.jobId;
    const timer = setInterval(async () => {
      try {
        const res = await whatsappService.getJob(jobId);
        if (res?.data) setJob(res.data as BulkSendJob);
      } catch (error: any) {
        // The backend restarted and forgot the job: stop polling.
        if (error?.response?.status === 404) {
          setJob((prev) =>
            prev && prev.jobId === jobId
              ? {
                  ...prev,
                  status: "failed",
                  error: "Lost track of this run (the server restarted).",
                }
              : prev,
          );
        }
        // Network blips: keep polling.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [job?.jobId, job?.status]);

  /** Starts a run. Resolves the job, or throws the backend's error message. */
  const start = useCallback(
    async (selection: WhatsAppReportSelection): Promise<BulkSendJob> => {
      if (startingRef.current) throw new Error("Already starting");
      startingRef.current = true;
      setStarting(true);
      try {
        const res = await whatsappService.sendAllReports(selection);
        const started = res.data as BulkSendJob;
        setJob(started);
        return started;
      } catch (error: any) {
        throw new Error(
          getApiErrorMessage(error, "Couldn't start sending reports"),
        );
      } finally {
        startingRef.current = false;
        setStarting(false);
      }
    },
    [],
  );

  const cancel = useCallback(async () => {
    if (!job || job.status !== "running") return;
    setCancelling(true);
    try {
      const res = await whatsappService.cancelJob(job.jobId);
      if (res?.data) setJob(res.data as BulkSendJob);
    } finally {
      setCancelling(false);
    }
  }, [job]);

  return { job, isRunning, starting, cancelling, start, cancel };
};
