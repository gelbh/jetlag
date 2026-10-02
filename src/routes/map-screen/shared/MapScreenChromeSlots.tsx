import type { ReactNode, Ref } from "react";
import { useMapLandscapeChrome } from "@/components/session/mapChrome/MapLandscapeChromeContext";
import {
  mapLandscapeChromeHeaderCollapseClass,
  mapLandscapeChromeToolbarCollapseClass,
} from "@/components/session/mapChrome/mapLandscapeChromeClasses";

export type MapScreenChromeSlotsLayout = "hud" | "fragments";

export type MapScreenChromeSlotsProps = {
  header: ReactNode;
  toolbar?: ReactNode;
  chromeHudRef?: Ref<HTMLDivElement>;
  /**
   * `hud`: fixed phone dock HUD.
   * `fragments`: header/toolbar/children as-is (admin compact overlays).
   */
  layout?: MapScreenChromeSlotsLayout;
  children?: ReactNode;
};

export function MapScreenChromeSlots({
  header,
  toolbar = null,
  chromeHudRef,
  layout = "hud",
  children,
}: MapScreenChromeSlotsProps) {
  const { mode: landscapeChromeMode, chip: landscapeChip } = useMapLandscapeChrome();
  if (layout === "fragments") {
    return (
      <div
        className="map-chrome-hud map-chrome-hud--fragments group/map-chrome pointer-events-none absolute inset-0 z-[var(--z-dock)] overflow-visible"
        data-landscape-chrome={landscapeChromeMode === "portrait" ? undefined : landscapeChromeMode}
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
        data-landscape-chrome={landscapeChromeMode === "portrait" ? undefined : landscapeChromeMode}
      >
        <div className={mapLandscapeChromeHeaderCollapseClass}>{header}</div>
        <div className={mapLandscapeChromeToolbarCollapseClass}>{toolbar}</div>
        {landscapeChip}
      </div>
      {children}
    </>
  );
}
