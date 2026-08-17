import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Island } from "@/components/ui/island";
import { OverlayHost } from "./OverlayHost";
import { ToolDeck } from "@/components/tools/ToolDeck";

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

const ISLAND_ARIA: Record<Exclude<MapBottomChromeIslandName, "hunt">, string> =
  {
    session: "Session tools",
    "map-controls": "Map controls",
  };

function SideIsland({
  name,
  children,
}: {
  name: Exclude<MapBottomChromeIslandName, "hunt">;
  children: ReactNode;
}) {
  return (
    <Island
      data-island={name}
      role="group"
      aria-label={ISLAND_ARIA[name]}
      size="default"
      variant="default"
      className={cn(
        "jl-map-island",
        `jl-map-island--${name}`,
        "w-[var(--map-chrome-side-width,3.25rem)] flex-none flex-col p-1",
      )}
    >
      {children}
    </Island>
  );
}

/**
 * Phone bottom chrome: OverlayHost + full-bleed ToolDeck hunt.
 * Side stack overlays trailing edge (choice a) — does not permanently steal hunt flex.
 */
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
      <OverlayHost ref={ref} layout={layout} style={style}>
        <div
          className={cn(
            "jl-map-bottom-chrome jl-tool-dock relative block w-full pointer-events-none bg-transparent",
            !isRail && "min-h-[calc(var(--dock-island-height)+0.75rem)]",
            isRail &&
              "jl-map-bottom-chrome--rail jl-tool-dock--rail relative flex h-full min-h-0 flex-col items-stretch justify-start gap-2 p-2",
            inactive && "jl-map-bottom-chrome--inactive opacity-55 saturate-50",
            sparseHunt && "jl-map-bottom-chrome--hunt-sparse",
            className,
          )}
          data-layout={layout}
          data-hunt-density={huntDensity}
          aria-disabled={inactive || undefined}
        >
          <div
            className={cn(
              "jl-map-chrome-bottom-band flex w-full flex-row items-end justify-center gap-2",
              /* Choice (a): no permanent trailing reserve — side stack overlays. */
              isRail && "contents",
            )}
          >
            {hunt ? <ToolDeck density={huntDensity}>{hunt}</ToolDeck> : null}
          </div>
          <div
            className={cn(
              "jl-map-chrome-side-stack pointer-events-none z-[3] flex flex-col items-stretch gap-2",
              isRail
                ? "contents"
                : /* bottom owned by CSS so landscape media can adjust without Tailwind override */
                  "jl-map-chrome-side-stack--phone absolute right-0",
            )}
          >
            {session ? <SideIsland name="session">{session}</SideIsland> : null}
            {mapControls ? (
              <SideIsland name="map-controls">{mapControls}</SideIsland>
            ) : null}
          </div>
        </div>
        {overlay}
      </OverlayHost>
    );
  },
);
