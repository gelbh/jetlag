import { Suspense } from "react";
import { isTerminalSessionSyncMessage } from "../domain/device/sync/terminalSessionMessage";
import { MapLandscapeChromeShell } from "../components/session/mapChrome/MapLandscapeChromeShell";
import { useMapLandscapeChrome } from "../components/session/mapChrome/MapLandscapeChromeContext";
import { resolveLandscapeMapControlInset } from "../components/session/mapChrome/resolveLandscapeMapControlInset";
import { useDesktopLayout } from "../hooks/layout/useDesktopLayout";
import { HeavyToolHost } from "./map-screen/lazyImports";
import { MapScreenChrome } from "./map-screen/MapScreenChrome";
import { MapScreenMapLayers } from "./map-screen/MapScreenMapLayers";
import {
  useMapScreenController,
  type MapScreenController,
} from "./map-screen/useMapScreenController";

function SeekerMapScreenBody({
  controller,
  isDesktop,
  inactiveChrome,
}: {
  controller: MapScreenController;
  isDesktop: boolean;
  inactiveChrome: boolean;
}) {
  const landscape = useMapLandscapeChrome();
  const mapChromeControlInset = resolveLandscapeMapControlInset(
    controller.mapChromeControlInset,
    isDesktop,
    landscape,
  ) as typeof controller.mapChromeControlInset;

  const layersController: MapScreenController = {
    ...controller,
    mapChromeControlInset,
  };

  const mapLayers = <MapScreenMapLayers controller={layersController} />;

  const mapLayersContent = inactiveChrome ? (
    <div className="h-full w-full saturate-50 brightness-95">{mapLayers}</div>
  ) : (
    mapLayers
  );

  return (
    <div
      className="map-screen-shell"
      data-map-attention={controller.mapAttentionActive ? "true" : undefined}
    >
      {inactiveChrome ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[calc(var(--z-banner)-1)] bg-surface-deep/30"
        />
      ) : null}
      {controller.heavyToolActive ? (
        <Suspense fallback={null}>
          <HeavyToolHost {...controller.heavyMapToolsSlotProps} />
        </Suspense>
      ) : null}
      {isDesktop ? null : mapLayersContent}
      <MapScreenChrome
        controller={controller}
        mapSlot={isDesktop ? mapLayersContent : undefined}
      />
    </div>
  );
}

export function SeekerMapScreen() {
  const controller = useMapScreenController();
  const isDesktop = useDesktopLayout();
  const syncMessage =
    controller.syncStatus.remoteUpdateNotice ??
    controller.syncStatus.lastSyncError ??
    controller.matchingAreasError;
  const inactiveChrome = isTerminalSessionSyncMessage(syncMessage);

  return (
    <MapLandscapeChromeShell
      sessionRules={controller.session!}
      timerState={controller.timer.timerState}
      timerHasStarted={controller.timer.hasStarted}
      pendingQuestions={controller.pendingQuestions}
      syncStatus={controller.syncStatus.status}
      queuedWrites={controller.syncStatus.queuedWrites}
      syncMessage={syncMessage}
    >
      <SeekerMapScreenBody
        controller={controller}
        isDesktop={isDesktop}
        inactiveChrome={inactiveChrome}
      />
    </MapLandscapeChromeShell>
  );
}
