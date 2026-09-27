import type { ReactNode, Ref } from "react";
import { useMapLandscapeChrome } from "@/components/session/mapChrome/MapLandscapeChromeContext";
import {
  mapLandscapeChromeHeaderCollapseClass,
  mapLandscapeChromeToolbarCollapseClass,
} from "@/components/session/mapChrome/mapLandscapeChromeClasses";

export type MapScreenChromeSlotsLayout = "hud" | "fragments";

export type MapScreenChromeSlotsProps = {
  /** Status / header region (top HUD). */
  header: ReactNode;
  /** Tool dock / bottom actions. */
  toolbar?: ReactNode;
  chromeHudRef?: Ref<HTMLDivElement>;
  /**
   * `hud` — fixed HUD (phone dock layout).
   * `fragments` — render header/toolbar/children as-is (admin compact overlays).
   */
  layout?: MapScreenChromeSlotsLayout;
  children?: ReactNode;
};

/**
 * Shared chrome layout slots for seeker/hider/observer/admin map screens.
 * Role chromes own slot contents; this component only places them.
 */
export function MapScreenChromeSlots({
  header,
  toolbar = null,
  chromeHudRef,
  layout = "hud",
  children,
}: MapScreenChromeSlotsProps) {
  const { mode: landscapeChromeMode, chip: landscapeChip } =
    useMapLandscapeChrome();
  if (layout === "fragments") {
    return (
      <div
        className="map-chrome-hud map-chrome-hud--fragments group/map-chrome pointer-events-none absolute inset-0 z-[var(--z-dock)] overflow-visible"
        data-landscape-chrome={
          landscapeChromeMode === "portrait" ? undefined : landscapeChromeMode
        }
      >
        <div className={mapLandscapeChromeHeaderCollapseClass}>{header}</div>
        <div className={mapLandscapeChromeToolbarCollapseClass}>{toolbar}</div>
        {landscapeChip}
        {children}
      </div>
    );
  }

  return (
    <>
      <div
        ref={chromeHudRef}
        id="map-chrome-hud-controls"
        className="map-chrome-hud group/map-chrome pointer-events-none absolute inset-0 z-[var(--z-dock)] overflow-visible"
        data-landscape-chrome={
          landscapeChromeMode === "portrait" ? undefined : landscapeChromeMode
        }
      >
        <div className={mapLandscapeChromeHeaderCollapseClass}>{header}</div>
        <div className={mapLandscapeChromeToolbarCollapseClass}>{toolbar}</div>
        {landscapeChip}
      </div>
      {children}
    </>
  );
}
