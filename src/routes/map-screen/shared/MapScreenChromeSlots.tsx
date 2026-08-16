import type { ReactNode, Ref } from "react";
import { DesktopOpsShell } from "@/components/map/chrome/DesktopOpsShell";
import { useMapLandscapeChrome } from "@/components/session/mapChrome/MapLandscapeChromeContext";
import {
  mapLandscapeChromeHeaderCollapseClass,
  mapLandscapeChromeToolbarCollapseClass,
} from "@/components/session/mapChrome/mapLandscapeChromeClasses";
import { useDesktopLayout } from "@/hooks/layout/useDesktopLayout";

export type MapScreenChromeSlotsLayout = "ops-or-hud" | "fragments";

export type MapScreenChromeSlotsProps = {
  /** Status / header region (top HUD or DesktopOpsShell status). */
  header: ReactNode;
  /** Tool dock / bottom actions (DesktopOpsShell tools). */
  toolbar?: ReactNode;
  /** When set with desktop layout + `ops-or-hud`, fills the ops shell map slot. */
  mapSlot?: ReactNode;
  contextual?: ReactNode;
  chromeHudRef?: Ref<HTMLDivElement>;
  /**
   * `ops-or-hud` — DesktopOpsShell when desktop+mapSlot, else fixed HUD.
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
  mapSlot,
  contextual,
  chromeHudRef,
  layout = "ops-or-hud",
  children,
}: MapScreenChromeSlotsProps) {
  const isDesktop = useDesktopLayout();
  const { mode: landscapeChromeMode, chip: landscapeChip } =
    useMapLandscapeChrome();
  if (layout === "fragments") {
    return (
      <div
        className="map-chrome-hud map-chrome-hud--fragments group/map-chrome pointer-events-none fixed inset-0 z-[var(--z-dock)] overflow-visible"
        data-player-ux-world="survey"
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

  if (isDesktop && mapSlot) {
    return (
      <>
        <DesktopOpsShell
          chromeHudRef={chromeHudRef}
          status={header}
          tools={toolbar}
          map={mapSlot}
          contextual={contextual}
        />
        {children}
      </>
    );
  }

  return (
    <>
      <div
        ref={chromeHudRef}
        id="map-chrome-hud-controls"
        className="map-chrome-hud group/map-chrome pointer-events-none fixed inset-0 z-[var(--z-dock)] overflow-visible"
        data-player-ux-world="survey"
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
