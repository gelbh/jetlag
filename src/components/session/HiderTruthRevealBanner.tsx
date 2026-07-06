import { useEffect } from "react";
import type { HiderTruthResult } from "../../domain/hiderTruthAnswer";

export interface HiderTruthRevealState {
  truth: HiderTruthResult;
  selectedReply: string;
}

interface HiderTruthRevealBannerProps {
  reveal: HiderTruthRevealState | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function HiderTruthRevealBanner({
  reveal,
  onDismiss,
}: HiderTruthRevealBannerProps) {
  useEffect(() => {
    if (!reveal) {
      return;
    }

    const timeoutId = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [reveal, onDismiss]);

  if (!reveal) {
    return null;
  }

  const { truth, selectedReply } = reveal;
  const matches =
    !truth.unavailable &&
    truth.replyId.length > 0 &&
    selectedReply === truth.replyId;

  return (
    <button
      type="button"
      onClick={onDismiss}
      data-testid="hider-truth-reveal-banner"
      className="pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top)+var(--status-bar-height)+0.75rem)] z-[var(--z-banner)] w-auto rounded-xl border border-border bg-surface-deep/95 px-3 py-2.5 text-left shadow-lg"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
        Station truth
      </p>
      <p className="mt-1 text-sm text-ink">
        {truth.unavailable
          ? truth.label
          : `Truthful answer: ${truth.label}`}
      </p>
      {!truth.unavailable ? (
        <p
          className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
            matches
              ? "bg-status-success/20 text-status-success"
              : "bg-status-warning-surface text-status-warning"
          }`}
        >
          {matches ? "Matches" : "Does not match"}
        </p>
      ) : null}
    </button>
  );
}
