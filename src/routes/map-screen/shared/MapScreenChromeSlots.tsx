import type { ReactNode, Ref } from "react";
import { DesktopOpsShell } from "../../../components/map/DesktopOpsShell";
import { useDesktopLayout } from "../../../hooks/useDesktopLayout";

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

  if (layout === "fragments") {
    return (
      <>
        {header}
        {toolbar}
        {children}
      </>
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
        className="map-chrome-hud pointer-events-none fixed inset-0 z-[var(--z-dock)] overflow-visible"
      >
        {header}
        {toolbar}
      </div>
      {children}
    </>
  );
}
