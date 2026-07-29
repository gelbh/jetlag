import type { ReactNode } from "react";
import { AppLink } from "../../components/navigation/AppLink";
import { ContextualRail } from "../../components/map/ContextualRail";
import type { ContextualRailTab } from "../../components/map/ContextualRailContext";
import { MapStatusRail } from "../../components/session/MapStatusRail";
import { HudHomeIcon } from "../../components/ui/HudIcons";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import type { SessionRecord } from "../../domain/map/annotations";
import type { UseMapOverlayStateResult } from "../../hooks/map/useMapOverlayState";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";
import { useDesktopLayout } from "../../hooks/useDesktopLayout";
import { MapScreenChromeSlots } from "../map-screen/shared/MapScreenChromeSlots";
import { getMapScreenRoleConfig } from "../map-screen/shared/mapScreenRoleConfig";

interface ObserverMapScreenChromeProps {
  session: SessionRecord;
  myRole: PlayerRole;
  timer: ReturnType<typeof useSessionTimer>;
  overlay: UseMapOverlayStateResult;
  onLeave: () => void;
  /** When set with desktop layout, map fills the ops shell center slot. */
  mapSlot?: ReactNode;
}

export function ObserverMapScreenChrome({
  session,
  myRole,
  timer,
  overlay,
  onLeave,
  mapSlot,
}: ObserverMapScreenChromeProps) {
  const roleConfig =
    myRole === "admin"
      ? getMapScreenRoleConfig("admin")
      : getMapScreenRoleConfig("observer");
  const leaveLabel =
    roleConfig.role === "admin" ? "Leave admin monitor" : "Leave observation";
  const isDesktop = useDesktopLayout();

  const statusBar = (
    <div className={isDesktop ? "jl-status-rail--expanded" : undefined}>
      <MapStatusRail
        sessionCode={session.code}
        sessionRules={session}
        playerRole={roleConfig.statusPlayerRole}
        activeTool="none"
        syncStatus="synced"
        queuedWrites={0}
        timerState={timer.timerState}
        timerRunning={timer.running}
        timerHasStarted={timer.hasStarted}
        canStartGame={false}
        onStartGame={() => undefined}
        onTimerStart={() => undefined}
        onTimerPause={() => undefined}
        onTimerReset={() => undefined}
        timerControlsDisabled
        expanded={isDesktop}
        headerLeading={
          <button
            type="button"
            className="hud-chrome map-hud-home inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-ink"
            aria-label={leaveLabel}
            onClick={onLeave}
          >
            <HudHomeIcon className="h-5 w-5" />
          </button>
        }
      />
    </div>
  );

  const logChatActions = (
    <>
      <button
        type="button"
        className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold uppercase tracking-wide ${
          overlay.isLogOpen
            ? "bg-action text-action-ink"
            : "bg-surface-raised text-ink"
        }`}
        onClick={() =>
          overlay.isLogOpen ? overlay.closeSheet() : overlay.openLog()
        }
      >
        Log
      </button>
      <button
        type="button"
        className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold uppercase tracking-wide ${
          overlay.isChatOpen
            ? "bg-action text-action-ink"
            : "bg-surface-raised text-ink"
        }`}
        onClick={() =>
          overlay.isChatOpen ? overlay.closeSheet() : overlay.openChat()
        }
      >
        Chat
      </button>
      {roleConfig.role === "admin" ? (
        <AppLink
          to="/admin"
          className="btn-secondary inline-flex min-h-11 items-center px-3 text-sm"
        >
          Admin
        </AppLink>
      ) : null}
    </>
  );

  const toolRail = (
    <div className="desktop-ops-observer-rail">
      <button
        type="button"
        className={`desktop-ops-observer-rail__btn${
          overlay.isLogOpen ? " desktop-ops-observer-rail__btn--active" : ""
        }`}
        onClick={() =>
          overlay.isLogOpen ? overlay.closeSheet() : overlay.openLog()
        }
      >
        Log
      </button>
      <button
        type="button"
        className={`desktop-ops-observer-rail__btn${
          overlay.isChatOpen ? " desktop-ops-observer-rail__btn--active" : ""
        }`}
        onClick={() =>
          overlay.isChatOpen ? overlay.closeSheet() : overlay.openChat()
        }
      >
        Chat
      </button>
      {roleConfig.role === "admin" ? (
        <AppLink
          to="/admin"
          className="desktop-ops-observer-rail__btn mt-auto no-underline"
        >
          Admin
        </AppLink>
      ) : null}
    </div>
  );

  const mobileToolbar = (
    <div className="jl-map-mobile-toolbar pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-dock)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-2">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
          {logChatActions}
        </div>
      </div>
    </div>
  );

  if (isDesktop && mapSlot) {
    const railActiveTab: ContextualRailTab | null =
      overlay.sheet === "log" || overlay.sheet === "chat"
        ? overlay.sheet
        : null;

    const handleSelectRailTab = (tab: ContextualRailTab) => {
      switch (tab) {
        case "log":
          overlay.openLog();
          return;
        case "chat":
          overlay.openChat();
          return;
        case "settings":
          return;
        default: {
          const _exhaustive: never = tab;
          return _exhaustive;
        }
      }
    };

    return (
      <MapScreenChromeSlots
        header={statusBar}
        toolbar={toolRail}
        mapSlot={mapSlot}
        contextual={
          <ContextualRail
            open={overlay.sheet === "log" || overlay.sheet === "chat"}
            activeTab={railActiveTab}
            onClose={overlay.closeSheet}
            onSelectTab={handleSelectRailTab}
            tabs={["log", "chat"]}
          />
        }
      />
    );
  }

  return (
    <MapScreenChromeSlots
      layout="fragments"
      header={statusBar}
      toolbar={mobileToolbar}
    />
  );
}
