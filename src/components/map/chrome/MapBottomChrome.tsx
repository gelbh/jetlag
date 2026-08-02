import type { CSSProperties, ReactNode } from "react";

export type MapBottomChromeLayout = "phone" | "rail";

export interface MapBottomChromeProps {
  layout?: MapBottomChromeLayout;
  inactive?: boolean;
  history?: ReactNode;
  hunt?: ReactNode;
  session?: ReactNode;
  mapControls?: ReactNode;
  className?: string;
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

export function MapBottomChrome({
  layout = "phone",
  inactive = false,
  history,
  hunt,
  session,
  mapControls,
  className = "",
  style,
}: MapBottomChromeProps) {
  const isRail = layout === "rail";

  return (
    <div
      className={`jl-map-bottom-chrome jl-tool-dock pointer-events-auto${isRail ? " jl-map-bottom-chrome--rail jl-tool-dock--rail" : ""}${inactive ? " pointer-events-none opacity-55 saturate-50" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      data-layout={layout}
    >
      {history ? <Island name="history">{history}</Island> : null}
      {hunt ? <Island name="hunt">{hunt}</Island> : null}
      {session ? <Island name="session">{session}</Island> : null}
      {mapControls ? <Island name="map-controls">{mapControls}</Island> : null}
    </div>
  );
}
