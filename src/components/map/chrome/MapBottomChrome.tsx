import { createElement, forwardRef, type CSSProperties, type ReactNode } from "react";
import { Box, Paper } from "@mantine/core";
import { cn } from "@/lib/cn";
import { iosMapChromeSurfaceStyles } from "@/components/ui/apple/iosEntryChrome";
import { OverlayHost } from "./OverlayHost";
import { MapSideDockStack } from "./MapSideDockStack";
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
  /** Ask-owned tool: ToolDeck ask-first instrument cluster. */
  askFirst?: boolean;
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
  const className = cn(
    "jl-map-island",
    `jl-map-island--${name}`,
    // Match Island base hit target under OverlayHost pointer-events-none stack.
    "pointer-events-auto",
    "h-fit w-[var(--map-chrome-side-width,3.25rem)] flex-none flex-col p-1",
    "text-field-ink-muted",
    "[&_.jl-tool-dock-group-secondary]:grow-0 [&_.jl-tool-dock-group-secondary]:shrink-0",
    "[&_.jl-tool-slot]:w-11 [&_.jl-tool-slot]:max-w-11 [&_.jl-tool-slot]:flex-none",
  );
  return (
    <Paper
      data-island={name}
      role="group"
      aria-label={ISLAND_ARIA[name]}
      radius={0}
      p={4}
      className={className}
      styles={{
        root: {
          ...iosMapChromeSurfaceStyles,
          /* Corner radii come from map-bottom-chrome.css (anchor-aware). */
        },
      }}
    >
      {children}
    </Paper>
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
      askFirst = false,
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
    const askFirstActive = askFirst;
    const chromeClassName = cn(
      "jl-map-bottom-chrome jl-tool-dock relative block w-full pointer-events-none bg-transparent",
      !isRail &&
        !askFirstActive &&
        "min-h-[calc(var(--dock-island-height)+0.75rem)]",
      !isRail && askFirstActive && "min-h-0",
      !isRail && "px-1",
      isRail &&
        "jl-map-bottom-chrome--rail jl-tool-dock--rail relative flex h-full min-h-0 flex-col items-stretch justify-start gap-2 p-2",
      isRail &&
        "[&_[data-tool-deck]]:w-full [&_[data-tool-deck]]:max-w-none [&_[data-tool-deck]]:flex-1 [&_[data-tool-deck]]:overflow-visible",
      isRail &&
        "[&_.jl-map-island-hunt-inner]:w-full [&_.jl-map-island-hunt-inner]:min-w-0 [&_.jl-map-island-hunt-inner]:flex-col [&_.jl-map-island-hunt-inner]:items-stretch",
      isRail &&
        "[&_.jl-tool-dock-group]:flex-col [&_.jl-tool-dock-group]:items-stretch [&_.jl-tool-dock-group-main]:w-full [&_.jl-tool-dock-group-main]:flex-1 [&_.jl-tool-slot]:w-auto [&_.jl-tool-slot]:max-w-none",
      inactive &&
        "jl-map-bottom-chrome--inactive [&_[data-island]]:pointer-events-none [&_[data-island]]:border-halt [&_[data-island]]:bg-halt-soft",
      sparseHunt && "jl-map-bottom-chrome--hunt-sparse",
      askFirstActive && "jl-map-bottom-chrome--ask-first",
      className,
    );
    return (
      <OverlayHost ref={ref} layout={layout} style={style}>
        {createElement(
          Box,
          {
            component: "div" as const,
            "data-testid": "map-bottom-chrome-mantine",
            "data-overlay-chrome": "",
            "data-layout": layout,
            "data-hunt-density": huntDensity,
            "data-ask-first": askFirstActive ? "true" : undefined,
            className: chromeClassName,
            "aria-disabled": inactive || undefined,
            inert: inactive || undefined,
          },
          <div
            className={cn(
              "jl-map-chrome-bottom-band flex w-full flex-row items-end justify-center gap-2",
              /* Choice (a): no permanent trailing reserve — side stack overlays. */
              isRail && "contents",
              sparseHunt && !isRail && "justify-center",
            )}
          >
            {hunt && !askFirstActive ? (
              <ToolDeck density={huntDensity} askFirst={false}>
                {hunt}
              </ToolDeck>
            ) : null}
          </div>,
          (() => {
            if (askFirstActive) {
              return null;
            }

            const sideIslands = (
              <>
                {session ? (
                  <SideIsland name="session">{session}</SideIsland>
                ) : null}
                {mapControls ? (
                  <SideIsland name="map-controls">{mapControls}</SideIsland>
                ) : null}
              </>
            );

            if (!isRail) {
              return <MapSideDockStack>{sideIslands}</MapSideDockStack>;
            }

            return (
              <div
                data-chrome-side-stack={isRail ? "rail" : "phone"}
                className={cn(
                  "jl-map-chrome-side-stack pointer-events-none z-[3] flex flex-col items-stretch gap-2",
                  isRail
                    ? "contents"
                    : "jl-map-chrome-side-stack--phone absolute right-0",
                )}
              >
                {sideIslands}
              </div>
            );
          })(),
        )}
        {overlay}
      </OverlayHost>
    );
  },
);
