import type { ReactNode } from "react";
import { AppLink } from "../../components/navigation/AppLink";
import { ContextualRail } from "../../components/map/ContextualRail";
import type { ContextualRailTab } from "../../components/map/ContextualRailContext";
import { DesktopOpsShell } from "../../components/map/DesktopOpsShell";
import { SessionTimerLabel } from "../../components/session/SessionTimerLabel";
import { SegmentControl } from "../../components/ui/SegmentControl";
import { HudHomeIcon } from "../../components/ui/HudIcons";
import {
  OBSERVER_PERSPECTIVE_OPTIONS,
  type ObserverPerspective,
} from "../../domain/session/observerPerspective";
import { playerRoleLabel } from "../../domain/session/playerRole";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { SessionRecord } from "../../domain/map/annotations";
import type { UseMapOverlayStateResult } from "../../hooks/map/useMapOverlayState";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";
import { useDesktopLayout } from "../../hooks/useDesktopLayout";

interface ObserverMapScreenChromeProps {
  session: SessionRecord;
  myRole: PlayerRole;
  timer: ReturnType<typeof useSessionTimer>;
  overlay: UseMapOverlayStateResult;
  perspective: ObserverPerspective;
  onPerspectiveChange: (perspective: ObserverPerspective) => void;
  onLeave: () => void;
  /** When set with desktop layout, map fills the ops shell center slot. */
  mapSlot?: ReactNode;
}

export function ObserverMapScreenChrome({
  session,
  myRole,
  timer,
  overlay,
  perspective,
  onPerspectiveChange,
  onLeave,
  mapSlot,
}: ObserverMapScreenChromeProps) {
  const roleLabel = playerRoleLabel(myRole);
  const leaveLabel =
    myRole === "admin" ? "Leave admin monitor" : "Leave observation";
  const isDesktop = useDesktopLayout();

  const statusBar = (
    <div
      className={
        isDesktop
          ? "desktop-ops-observer-status pointer-events-none px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
          : "pointer-events-none absolute inset-x-0 top-0 z-[var(--z-dock)] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      }
    >
      <div className="pointer-events-auto jl-status-bar mx-auto flex max-w-xl items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold tracking-[0.18em] text-ink">
            {session.code}
          </p>
          <p className="text-xs tabular-nums text-ink-muted">
            <SessionTimerLabel timerState={timer.timerState} />
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-brand-blue/50 bg-brand-blue/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
          {roleLabel}
        </span>
        <button
          type="button"
          className="hud-chrome inline-flex min-h-11 min-w-11 items-center justify-center"
          aria-label={leaveLabel}
          onClick={onLeave}
        >
          <HudHomeIcon className="size-5" />
        </button>
      </div>
      {isDesktop ? (
        <div className="pointer-events-auto mx-auto mt-2 max-w-xl rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
          <SegmentControl
            value={perspective}
            options={OBSERVER_PERSPECTIVE_OPTIONS}
            onChange={onPerspectiveChange}
            aria-label="Spectator perspective"
            variant="pill"
          />
        </div>
      ) : null}
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
      {myRole === "admin" ? (
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
      {myRole === "admin" ? (
        <AppLink
          to="/admin"
          className="desktop-ops-observer-rail__btn mt-auto no-underline"
        >
          Admin
        </AppLink>
      ) : null}
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
          overlay.openLog();
          return;
        default: {
          const _exhaustive: never = tab;
          return _exhaustive;
        }
      }
    };

    return (
      <DesktopOpsShell
        status={statusBar}
        tools={toolRail}
        map={mapSlot}
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
    <>
      {statusBar}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-dock)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-2">
          <div className="rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
            <SegmentControl
              value={perspective}
              options={OBSERVER_PERSPECTIVE_OPTIONS}
              onChange={onPerspectiveChange}
              aria-label="Spectator perspective"
              variant="pill"
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
            {logChatActions}
          </div>
        </div>
      </div>
    </>
  );
}
