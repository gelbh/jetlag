import { useCallback, useEffect, useState } from "react";
import { copyToClipboard } from "../platform/copyToClipboard";

export type CopyFeedbackStatus = "idle" | "copied" | "failed";

interface UseCopyFeedbackOptions {
  successResetMs?: number;
  failureResetMs?: number;
}

export function useCopyFeedback({
  successResetMs = 2000,
  failureResetMs = 3000,
}: UseCopyFeedbackOptions = {}) {
  const [status, setStatus] = useState<CopyFeedbackStatus>("idle");

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const resetMs = status === "copied" ? successResetMs : failureResetMs;
    const timer = window.setTimeout(() => setStatus("idle"), resetMs);
    return () => window.clearTimeout(timer);
  }, [status, successResetMs, failureResetMs]);

  const copy = useCallback(async (text: string) => {
    const ok = await copyToClipboard(text);
    setStatus(ok ? "copied" : "failed");
    return ok;
  }, []);

  return { status, copy };
}
