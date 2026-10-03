import { jetlagBrand } from "@/theme/theme";
import { HudBanner } from "../hud/HudBanner";
import { MapFloatSurface } from "./MapFloatSurface";

const MAP_STATUS_CHIP_CLASS = "pointer-events-auto mx-3 mt-1.5 z-[var(--z-panel)]";

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
    <HudBanner visible={visible} className={MAP_STATUS_CHIP_CLASS}>
      <MapFloatSurface
        tone="info"
        data-testid="measuring-refine-chip"
        className="mx-auto flex max-w-[min(calc(100%-1.5rem),22rem)] items-center gap-2.5"
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
            border: `2px solid oklch(from ${jetlagBrand.flag} l c h / 0.25)`,
            borderTopColor: jetlagBrand.flag,
            animation: "jl-refine-spin 0.7s linear infinite",
          }}
        />
        <div className="min-w-0 flex-1">
          <p
            className="m-0 text-[0.6875rem] font-semibold leading-none"
            style={{ color: jetlagBrand.fieldInkMuted }}
          >
            {title}
          </p>
          <p
            className="m-0 mt-1 text-sm font-medium leading-snug"
            style={{ color: jetlagBrand.fieldInk }}
          >
            {body}
          </p>
        </div>
        <style>{`
          @keyframes jl-refine-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </MapFloatSurface>
    </HudBanner>
  );
}
