import { useEffect } from "react";
import type { HiderTruthResult } from "../../domain/questions/hiderTruthAnswer";

export interface HiderTruthRevealState {
  truth: HiderTruthResult;
  selectedReply: string;
  selectedLabel: string;
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

  const { truth, selectedLabel } = reveal;

  return (
    <button
      type="button"
      onClick={onDismiss}
      data-testid="hider-truth-reveal-banner"
      className="map-float-alert pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top)+var(--status-bar-height)+0.75rem)] z-[var(--z-banner)] w-auto border border-status-info/40 bg-status-info-surface px-3 py-2.5 text-left"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
        Bluff sent
      </p>
      <p className="mt-1 text-sm text-ink">
        Sent: {selectedLabel} — station truth was {truth.label}
      </p>
      <p className="mt-1.5 inline-flex rounded-md bg-status-warning-surface px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-status-warning">
        Does not match
      </p>
    </button>
  );
}
