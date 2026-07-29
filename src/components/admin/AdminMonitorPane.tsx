import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampMonitorLayoutToCols,
  defaultMonitorLayout,
  hideMonitorPanel,
  mergeMonitorPanelOntoStack,
  monitorLayoutsEqual,
  reorderMonitorPanelInStack,
  setMonitorCollapsed,
  setMonitorPinned,
  setMonitorStackActiveIndex,
  showMonitorPanel,
  unstackMonitorPanelToCell,
  type MonitorLayout,
  type MonitorPanelId,
} from "../../domain/admin/opsDeskLayout";
import { useAdminMapWideLayout } from "../../hooks/admin/useAdminMapWideLayout";
import { usePlayerLocationsSync } from "../../hooks/session/useSessionExtrasSync";
import { adminModerateSession } from "../../services/admin/adminModeration";
import { useMapStore, useSessionStore } from "../../state/sessionStore";
import { AdminMapScreen } from "../../routes/AdminMapScreen";
import { AdminMonitorPanelContent } from "../../routes/admin-map-screen/AdminMonitorPanelContent";
import { useObserverMapScreen } from "../../routes/observer-map-screen/useObserverMapScreen";
import { InlineError } from "../ui/InlineError";
import { useAdminMonitorFocus } from "../../domain/admin/adminMonitorFocus";
import type { AdminMonitorPanelBodies } from "./AdminMonitorPanelBody";
import { AdminMonitorGridWorkspace } from "./AdminMonitorGridWorkspace";
import { AdminPlayerRoster } from "./AdminPlayerRoster";

export function AdminMonitorPane({
  active,
  sessionCode,
  errorMessage,
  monitorLayout,
  onMonitorLayoutChange,
}: {
  active: boolean;
  sessionCode?: string | null;
  errorMessage?: string | null;
  monitorLayout?: MonitorLayout;
  onMonitorLayoutChange?: (layout: MonitorLayout) => void;
}) {
  const session = useSessionStore((state) => state.session);
  const locations = usePlayerLocationsSync(active ? session?.id : undefined);
  const setFocusedPlayerUid = useAdminMonitorFocus(
    (state) => state.setFocusedPlayerUid,
  );
  const shellRef = useRef<HTMLDivElement>(null);
  const controller = useObserverMapScreen();
  const setLayerVisibility = useMapStore((state) => state.setLayerVisibility);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const isWide = useAdminMapWideLayout(shellRef, {
    embedded: true,
    ready: active && controller.playAreaReady,
  });

  const resolvedLayout = monitorLayout ?? defaultMonitorLayout();

  useEffect(() => {
    if (!active) {
      setFocusedPlayerUid(null);
    }
  }, [active, setFocusedPlayerUid]);

  const mutateMonitorLayout = useCallback(
    (mutator: (layout: MonitorLayout) => MonitorLayout) => {
      if (!onMonitorLayoutChange) return;
      const current = resolvedLayout;
      const next = clampMonitorLayoutToCols(mutator(current));
      if (monitorLayoutsEqual(current, next)) return;
      onMonitorLayoutChange(next);
    },
    [onMonitorLayoutChange, resolvedLayout],
  );

  const handleModerationAction = useCallback(
    async (action: "end" | "resetBoard" | "cleanupCode") => {
      const sessionId = controller.session?.id;
      if (!sessionId) return;

      const labels = {
        end: "Force end this game?",
        resetBoard: "Reset the board for this session?",
        cleanupCode: "End this session and retire its join code?",
      } as const;

      if (!window.confirm(labels[action])) return;

      setModerationBusy(true);
      setModerationError(null);

      try {
        await adminModerateSession(sessionId, action);
      } catch (error) {
        setModerationError(
          error instanceof Error ? error.message : "Moderation failed.",
        );
      } finally {
        setModerationBusy(false);
      }
    },
    [controller.session?.id],
  );

  const syncStatusLabel = controller.syncStatus.lastSyncError
    ? `Error: ${controller.syncStatus.lastSyncError}`
    : controller.syncStatus.status;
  const sessionRules = controller.sessionRules ?? controller.session;
  const chatDisplayRole = controller.spectatorLayers.chatDisplayRole;

  const panelBodies = useMemo((): AdminMonitorPanelBodies | null => {
    if (!active || !controller.session || !sessionRules) return null;

    const shared = {
      session: controller.session,
      sessionRules,
      syncStatusLabel,
      controller,
      chatDisplayRole,
      moderationBusy,
      moderationError,
      onModerationAction: (action: "end" | "resetBoard" | "cleanupCode") => {
        void handleModerationAction(action);
      },
      mapViewport: controller.mapViewport,
      onLayerVisibilityChange: setLayerVisibility,
      onLowPowerModeChange: setLowPowerMode,
    };

    const renderPanel = (panelId: MonitorPanelId) => (
      <div className="jl-scroll jl-ops-panel-scroll h-full min-h-0">
        {panelId === "roster" ? (
          <AdminPlayerRoster session={session} locations={locations} />
        ) : (
          <AdminMonitorPanelContent panelId={panelId} {...shared} />
        )}
      </div>
    );

    return {
      map: renderPanel("map"),
      roster: renderPanel("roster"),
      overview: renderPanel("overview"),
      log: renderPanel("log"),
      chat: renderPanel("chat"),
      sync: renderPanel("sync"),
      mapTools: renderPanel("mapTools"),
      mod: renderPanel("mod"),
    };
  }, [
    active,
    chatDisplayRole,
    controller,
    handleModerationAction,
    locations,
    moderationBusy,
    moderationError,
    session,
    sessionRules,
    setLayerVisibility,
    setLowPowerMode,
    syncStatusLabel,
  ]);

  if (errorMessage) {
    return (
      <div className="admin-monitor-pane flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-status-error/40 bg-status-error-surface/40 px-6 py-10 text-center">
        <div className="max-w-sm space-y-3">
          <p className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Monitor unavailable
          </p>
          <InlineError>{errorMessage}</InlineError>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="admin-monitor-pane flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-border bg-surface-panel/60 px-6 py-10 text-center">
        <div className="space-y-2">
          <p className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Monitor pane
          </p>
          <p className="text-sm text-ink-muted">
            Select a live session to watch the map here on desktop.
          </p>
        </div>
      </div>
    );
  }

  if (
    isWide &&
    onMonitorLayoutChange &&
    panelBodies &&
    controller.playAreaReady
  ) {
    return (
      <div
        ref={shellRef}
        className="admin-monitor-pane admin-monitor-pane--nested-wm relative h-full min-h-0 overflow-hidden rounded-xl border border-border bg-surface-deep"
        data-testid="admin-monitor-nested-wm"
      >
        {sessionCode ? (
          <p className="admin-monitor-code-badge pointer-events-none absolute bottom-3 left-3 z-[var(--z-panel)] rounded-md border border-border bg-surface-panel/90 px-2 py-1 font-mono text-xs tracking-[0.18em] text-ink">
            {sessionCode}
          </p>
        ) : null}
        <AdminMonitorGridWorkspace
          layout={resolvedLayout}
          bodies={panelBodies}
          onLayoutChange={onMonitorLayoutChange}
          onMergePanel={(targetStackId, payload) => {
            mutateMonitorLayout((layout) =>
              mergeMonitorPanelOntoStack(
                layout,
                payload.sourceStackId,
                payload.panelId,
                targetStackId,
              ),
            );
          }}
          onReorderPanel={(stackId, fromIndex, toIndex) => {
            mutateMonitorLayout((layout) =>
              reorderMonitorPanelInStack(layout, stackId, fromIndex, toIndex),
            );
          }}
          onUnstackPanel={(sourceStackId, panelId, x, y, w, h) => {
            mutateMonitorLayout((layout) =>
              unstackMonitorPanelToCell(
                layout,
                sourceStackId,
                panelId,
                x,
                y,
                w,
                h,
              ),
            );
          }}
          onPlacePanel={(panelId, x, y, w, h) => {
            mutateMonitorLayout((layout) =>
              showMonitorPanel(layout, panelId, { x, y, w, h }),
            );
          }}
          onActiveIndexChange={(stackId, activeIndex) => {
            mutateMonitorLayout((layout) =>
              setMonitorStackActiveIndex(layout, stackId, activeIndex),
            );
          }}
          onPinToggle={(stackId) => {
            mutateMonitorLayout((layout) => {
              const stack = layout.stacks.find((s) => s.id === stackId);
              if (!stack) return layout;
              return setMonitorPinned(layout, stackId, !stack.pinned);
            });
          }}
          onCollapseToggle={(stackId) => {
            mutateMonitorLayout((layout) => {
              const stack = layout.stacks.find((s) => s.id === stackId);
              if (!stack) return layout;
              return setMonitorCollapsed(layout, stackId, !stack.collapsed);
            });
          }}
          onCloseActive={(stackId) => {
            mutateMonitorLayout((layout) => {
              const stack = layout.stacks.find((s) => s.id === stackId);
              if (!stack) return layout;
              const panelId =
                stack.panelIds[stack.activeIndex] ?? stack.panelIds[0];
              if (!panelId) return layout;
              return hideMonitorPanel(layout, panelId);
            });
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className="admin-monitor-pane flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface-deep"
      data-testid="admin-monitor-compact"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <AdminMapScreen embeddedMonitor />
        </div>
        {sessionCode ? (
          <p className="admin-monitor-code-badge pointer-events-none absolute bottom-3 left-3 z-[var(--z-panel)] rounded-md border border-border bg-surface-panel/90 px-2 py-1 font-mono text-xs tracking-[0.18em] text-ink">
            {sessionCode}
          </p>
        ) : null}
      </div>
      <div className="max-h-48 shrink-0 overflow-hidden px-2 pb-2">
        <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Player roster
        </p>
        <AdminPlayerRoster session={session} locations={locations} />
      </div>
    </div>
  );
}
