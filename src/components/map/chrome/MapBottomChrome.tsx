import { forwardRef, type CSSProperties, type ReactNode } from "react";

export type MapBottomChromeLayout = "phone" | "rail";

export interface MapBottomChromeProps {
  layout?: MapBottomChromeLayout;
  inactive?: boolean;
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
  children,
}: {
  name: "history" | "hunt" | "session" | "map-controls";
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

  return (
    <div
      data-island={name}
      className={`jl-map-island jl-map-island--${name}`}
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

    return (
      <div
        ref={ref}
        className={`jl-map-bottom-chrome-host${isRail ? " jl-map-bottom-chrome-host--rail" : ""}`}
        style={isRail ? undefined : style}
      >
        <div
          className={`jl-map-bottom-chrome jl-tool-dock${isRail ? " jl-map-bottom-chrome--rail jl-tool-dock--rail" : ""}${inactive ? " jl-map-bottom-chrome--inactive" : ""}${className ? ` ${className}` : ""}`}
          data-layout={layout}
          aria-disabled={inactive || undefined}
        >
          <div className="jl-map-chrome-bottom-band">
            {history ? <Island name="history">{history}</Island> : null}
            {hunt ? <Island name="hunt">{hunt}</Island> : null}
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
