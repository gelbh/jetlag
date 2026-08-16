import { HudBanner } from "../hud/HudBanner";

const DEFAULT_TITLE = "Refining measure";
const DEFAULT_BODY = "Adding detail to the shaded area…";

export function MeasuringRefineMapChip({
  visible,
  title = DEFAULT_TITLE,
  body = DEFAULT_BODY,
}: {
  visible: boolean;
  title?: string;
  body?: string;
}) {
  return (
    <HudBanner
      visible={visible}
      className="jl-app-update-chip jl-measuring-refine-chip pointer-events-auto fixed inset-x-0 z-[var(--z-panel)] px-3"
    >
      <div
        className="map-float-alert mx-auto max-w-[min(calc(100%-1.5rem),24rem)] border-2 border-highlight bg-surface-deep px-3 py-2 normal-case tracking-normal"
        role="status"
        aria-live="polite"
      >
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-highlight">
          {title}
        </p>
        <p className="text-sm text-ink">{body}</p>
      </div>
    </HudBanner>
  );
}
