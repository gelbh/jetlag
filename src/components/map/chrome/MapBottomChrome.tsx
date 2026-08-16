import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../../lib/cn";

export type MapBottomChromeLayout = "phone" | "rail";

/** Seeker multi-tool Hunt (`tools`) vs hider 1–2 chip content-sized island (`sparse`). */
export type MapBottomChromeHuntDensity = "tools" | "sparse";

export type MapBottomChromeIslandName = "hunt" | "session" | "map-controls";

export interface MapBottomChromeProps {
  layout?: MapBottomChromeLayout;
  inactive?: boolean;
  /** Default `tools` — full-width hunt shrink for many question chips. */
  huntDensity?: MapBottomChromeHuntDensity;
  hunt?: ReactNode;
  session?: ReactNode;
  mapControls?: ReactNode;
  /** Rendered inside the host (e.g. Draw menu). */
  overlay?: ReactNode;
  className?: string;
  /** Applied to the fixed phone host (e.g. visualViewport bottom inset). */
  style?: CSSProperties;
}

const ISLAND_ARIA: Record<MapBottomChromeIslandName, string> = {
  hunt: "Hunt tools",
  session: "Session tools",
  "map-controls": "Map controls",
};

function Island({
  name,
  huntDensity,
  children,
}: {
  name: MapBottomChromeIslandName;
  huntDensity?: MapBottomChromeHuntDensity;
  children: ReactNode;
}) {
  const sparseHunt = name === "hunt" && huntDensity === "sparse";

  return (
    <div
      data-island={name}
      data-hunt-density={sparseHunt ? "sparse" : undefined}
      className={cn(
        "jl-map-island",
        `jl-map-island--${name}`,
        sparseHunt && "jl-map-island--hunt-sparse",
      )}
      role="group"
      aria-label={ISLAND_ARIA[name]}
    >
      {children}
    </div>
  );
}

export const MapBottomChrome = forwardRef<HTMLDivElement, MapBottomChromeProps>(
  function MapBottomChrome(
    {
      layout = "phone",
      inactive = false,
      huntDensity = "tools",
      hunt,
      session,
      mapControls,
      overlay,
      className = "",
      style,
    },
    ref,
  ) {
    const isRail = layout === "rail";
    const sparseHunt = huntDensity === "sparse";
    return (
      <div
        ref={ref}
        className={cn(
          "jl-map-bottom-chrome-host",
          isRail && "jl-map-bottom-chrome-host--rail",
        )}
        style={isRail ? undefined : style}
      >
        <div
          className={cn(
            "jl-map-bottom-chrome",
            /* Compat selector + CSS hooks; survey skin neutralizes fixed chassis. */
            "jl-tool-dock",
            isRail && "jl-map-bottom-chrome--rail jl-tool-dock--rail",
            inactive && "jl-map-bottom-chrome--inactive",
            sparseHunt && "jl-map-bottom-chrome--hunt-sparse",
            className,
          )}
          data-layout={layout}
          data-hunt-density={huntDensity}
          aria-disabled={inactive || undefined}
        >
          <div className="jl-map-chrome-bottom-band">
            {hunt ? (
              <Island name="hunt" huntDensity={huntDensity}>
                {hunt}
              </Island>
            ) : null}
          </div>
          <div className="jl-map-chrome-side-stack">
            {session ? <Island name="session">{session}</Island> : null}
            {mapControls ? (
              <Island name="map-controls">{mapControls}</Island>
            ) : null}
          </div>
        </div>
        {overlay}
      </div>
    );
  },
);
