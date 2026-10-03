import type { HiderTruthResult } from "@/domain/questions/ui";
import { MAP_NOTICE_DURATION_MS } from "@/domain/ui/mapNoticeLifetime";
import { useTimedDismiss } from "@/hooks/ui/useTimedDismiss";
import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";
import { HudBanner } from "../../ui/hud/HudBanner";

export interface HiderTruthRevealState {
  truth: HiderTruthResult;
  selectedReply: string;
  selectedLabel: string;
}

interface HiderTruthRevealBannerProps {
  reveal: HiderTruthRevealState | null;
  onDismiss: () => void;
}

export function HiderTruthRevealBanner({ reveal, onDismiss }: HiderTruthRevealBannerProps) {
  useTimedDismiss({
    active: Boolean(reveal),
    ms: MAP_NOTICE_DURATION_MS.truthReveal,
    onDismiss,
    restartKey: reveal,
  });

  return (
    <HudBanner
      visible={Boolean(reveal)}
      onDismiss={onDismiss}
      className="pointer-events-auto absolute inset-x-3 top-[calc(var(--safe-area-top)+var(--status-bar-height)+0.75rem)] z-[var(--z-banner)]"
    >
      {reveal ? (
        <button
          type="button"
          onClick={onDismiss}
          data-testid="hider-truth-reveal-banner"
          className="w-auto border-0 bg-transparent p-0 text-left"
        >
          <MapFloatSurface tone="info">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
              Bluff sent
            </p>
            <p className="mt-1 text-sm text-ink">
              Sent: {reveal.selectedLabel}, answer truth was {reveal.truth.label}
            </p>
            <p className="mt-1.5 inline-flex rounded-md bg-status-warning-surface px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-status-warning">
              Does not match
            </p>
          </MapFloatSurface>
        </button>
      ) : null}
    </HudBanner>
  );
}
