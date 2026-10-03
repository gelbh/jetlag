import { Suspense } from "react";
import { MapAttentionRing } from "../components/map/chrome/MapAttentionRing";
import { MapLandscapeChromeShell } from "../components/session/mapChrome/MapLandscapeChromeShell";
import { isTerminalSessionSyncMessage } from "../domain/device/sync/terminalSessionMessage";
import { HeavyToolHost } from "./map-screen/lazyImports";
import { MapScreenChrome } from "./map-screen/MapScreenChrome";
import { MapScreenMapLayers } from "./map-screen/MapScreenMapLayers";
import {
  type MapScreenController,
  useMapScreenController,
} from "./map-screen/useMapScreenController";

function SeekerMapScreenBody({
  controller,
  inactiveChrome,
}: {
  controller: MapScreenController;
  inactiveChrome: boolean;
}) {
  "use memo";
  const mapLayers = <MapScreenMapLayers controller={controller} />;

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
      <MapAttentionRing active={controller.mapAttentionActive} />
      {inactiveChrome ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[calc(var(--z-banner)-1)] bg-surface-deep/30"
        />
      ) : null}
      {controller.heavyToolActive ? (
        <Suspense fallback={null}>
          <HeavyToolHost model={controller.heavyMapToolsSlotProps} />
        </Suspense>
      ) : null}
      {mapLayersContent}
      <MapScreenChrome controller={controller} />
    </div>
  );
}

export function SeekerMapScreen() {
  "use memo";
  const controller = useMapScreenController();
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
      <SeekerMapScreenBody controller={controller} inactiveChrome={inactiveChrome} />
    </MapLandscapeChromeShell>
  );
}
