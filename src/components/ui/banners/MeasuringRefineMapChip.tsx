import { HudBanner } from "../hud/HudBanner";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";

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
        data-testid="measuring-refine-chip"
        className="mx-auto flex max-w-[min(calc(100%-1.5rem),22rem)] items-center gap-2.5 px-3 py-2.5"
        style={{
          ...mapChromeSurfaceStyles,
          borderRadius: 14,
          color: "var(--color-field-ink)",
        }}
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            borderRadius: "50%",
            border: "2px solid oklch(from var(--color-flag) l c h / 0.25)",
            borderTopColor: "var(--color-flag)",
            animation: "jl-refine-spin 0.7s linear infinite",
          }}
        />
        <div className="min-w-0 flex-1">
          <p
            className="m-0 text-[0.6875rem] font-semibold leading-none"
            style={{ color: "var(--color-field-ink-muted)" }}
          >
            {title}
          </p>
          <p
            className="m-0 mt-1 text-sm font-medium leading-snug"
            style={{ color: "var(--color-field-ink)" }}
          >
            {body}
          </p>
        </div>
        <style>{`
          @keyframes jl-refine-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </HudBanner>
  );
}
