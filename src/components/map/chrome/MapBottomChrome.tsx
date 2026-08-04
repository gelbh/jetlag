import { forwardRef, type CSSProperties, type ReactNode } from "react";

export type MapBottomChromeLayout = "phone" | "rail";

/** Seeker multi-tool Hunt (`tools`) vs hider 1–2 chip content-sized island (`sparse`). */
export type MapBottomChromeHuntDensity = "tools" | "sparse";

export interface MapBottomChromeProps {
  layout?: MapBottomChromeLayout;
  inactive?: boolean;
  /** Default `tools` — full-width hunt shrink for many question chips. */
  huntDensity?: MapBottomChromeHuntDensity;
  history?: ReactNode;
  hunt?: ReactNode;
  session?: ReactNode;
  mapControls?: ReactNode;
  /** Rendered inside the host (e.g. Draw menu). */
  overlay?: ReactNode;
  className?: string;
  /** Applied to the fixed phone host (e.g. visualViewport bottom inset). */
  style?: CSSProperties;
}

function Island({
  name,
  huntDensity,
  children,
}: {
  name: "history" | "hunt" | "session" | "map-controls";
  huntDensity?: MapBottomChromeHuntDensity;
  children: ReactNode;
}) {
  const ariaLabel =
    name === "map-controls"
      ? "Map controls"
      : name === "session"
        ? "Session tools"
        : name === "history"
          ? "History"
          : "Hunt tools";

  const sparseHunt = name === "hunt" && huntDensity === "sparse";

  return (
    <div
      data-island={name}
      data-hunt-density={sparseHunt ? "sparse" : undefined}
      className={`jl-map-island jl-map-island--${name}${sparseHunt ? " jl-map-island--hunt-sparse" : ""}`}
      role="group"
      aria-label={ariaLabel}
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
      history,
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
        className={`jl-map-bottom-chrome-host${isRail ? " jl-map-bottom-chrome-host--rail" : ""}`}
        style={isRail ? undefined : style}
      >
        <div
          className={`jl-map-bottom-chrome jl-tool-dock${isRail ? " jl-map-bottom-chrome--rail jl-tool-dock--rail" : ""}${inactive ? " jl-map-bottom-chrome--inactive" : ""}${sparseHunt ? " jl-map-bottom-chrome--hunt-sparse" : ""}${className ? ` ${className}` : ""}`}
          data-layout={layout}
          data-hunt-density={huntDensity}
          aria-disabled={inactive || undefined}
        >
          <div className="jl-map-chrome-bottom-band">
            {history ? <Island name="history">{history}</Island> : null}
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
