import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { Box, Paper } from "@mantine/core";
import { cn } from "@/lib/cn";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import { OverlayHost } from "./OverlayHost";
import { MapSideDockStack } from "./MapSideDockStack";
import { ToolDeck } from "@/components/tools/ToolDeck";

/** Seeker multi-tool Hunt (`tools`) vs hider 1–2 chip content-sized island (`sparse`). */
export type MapBottomChromeHuntDensity = "tools" | "sparse";

export type MapBottomChromeIslandName = "hunt" | "session" | "map-controls";

export interface MapBottomChromeProps {
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
          ...mapChromeSurfaceStyles,
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
    const sparseHunt = huntDensity === "sparse";
    const askFirstActive = askFirst;
    const chromeClassName = cn(
      "jl-map-bottom-chrome jl-tool-dock relative block w-full pointer-events-none bg-transparent",
      !askFirstActive &&
        "min-h-[calc(var(--dock-island-height)+0.75rem)]",
      askFirstActive && "min-h-0",
      "px-1",
      inactive &&
        "jl-map-bottom-chrome--inactive [&_[data-island]]:pointer-events-none [&_[data-island]]:border-halt [&_[data-island]]:bg-halt-soft",
      sparseHunt && "jl-map-bottom-chrome--hunt-sparse",
      askFirstActive && "jl-map-bottom-chrome--ask-first",
      className,
    );
    return (
      <OverlayHost ref={ref} style={style}>
        <Box
          component="div"
          data-testid="map-bottom-chrome-mantine"
          data-overlay-chrome=""
          data-layout="phone"
          data-hunt-density={huntDensity}
          data-ask-first={askFirstActive ? "true" : undefined}
          className={chromeClassName}
          aria-disabled={inactive || undefined}
          {...(inactive ? { inert: true } : {})}
        >
          <div
            className={cn(
              "jl-map-chrome-bottom-band flex w-full flex-row items-end justify-center gap-2",
              sparseHunt && "justify-center",
            )}
          >
            {hunt && !askFirstActive ? (
              <ToolDeck density={huntDensity} askFirst={false}>
                {hunt}
              </ToolDeck>
            ) : null}
          </div>
          {askFirstActive ? null : (
            <MapSideDockStack>
              {session ? (
                <SideIsland name="session">{session}</SideIsland>
              ) : null}
              {mapControls ? (
                <SideIsland name="map-controls">{mapControls}</SideIsland>
              ) : null}
            </MapSideDockStack>
          )}
        </Box>
        {overlay}
      </OverlayHost>
    );
  },
);
