import type { ReactNode } from "react";
import { AppLink } from "../../components/navigation/AppLink";
import { ContextualRail } from "../../components/map/chrome/ContextualRail";
import type { ContextualRailTab } from "../../components/map/chrome/ContextualRailContext";
import { MapBottomChrome } from "../../components/map/chrome/MapBottomChrome";
import { MapStatusRail } from "../../components/session/mapChrome/MapStatusRail";
import { RoleCodesSheet } from "../../components/session/settings/RoleCodesSheet";
import {
  HudAdminIcon,
  HudHomeIcon,
  HudStarIcon,
} from "../../components/ui/brand/HudIcons";
import { MotionPressable } from "../../components/motion/MotionPressable";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { visibleRoleCodeRoles } from "../../domain/session/players/roleGates";
import type { SessionRecord } from "../../domain/map/annotations";
import type { UseMapOverlayStateResult } from "../../hooks/map/useMapOverlayState";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";
import { useDesktopLayout } from "../../hooks/layout/useDesktopLayout";
import { MapScreenChromeSlots } from "../map-screen/shared/MapScreenChromeSlots";
import { getMapScreenRoleConfig } from "../map-screen/shared/mapScreenRoleConfig";

interface ObserverMapScreenChromeProps {
  session: SessionRecord;
  myRole: PlayerRole;
  myUid?: string;
  isHost?: boolean;
  timer: ReturnType<typeof useSessionTimer>;
  overlay: UseMapOverlayStateResult;
  onLeave: () => void;
  /** When set with desktop layout, map fills the ops shell center slot. */
  mapSlot?: ReactNode;
}

export function ObserverMapScreenChrome({
  session,
  myRole,
  myUid,
  isHost = false,
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
  const isAdmin = roleConfig.role === "admin";
  const canOpenCodes =
    Boolean(myUid) &&
    visibleRoleCodeRoles({
      roleGates: session.roleGates,
      memberRoles: session.memberRoles,
      myUid,
      isHost,
    }).length > 0;

  const statusBar = (
    <div className={isDesktop ? "jl-status-rail--expanded" : undefined}>
      <MapStatusRail
        sessionCode={session.code}
        sessionId={session.id}
        roleGates={session.roleGates}
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
        myUid={myUid}
        isHost={isHost}
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

  const sessionIsland = (
    <div className="jl-tool-dock-group jl-tool-dock-group-secondary">
      {isAdmin ? (
        <AppLink
          to="/admin"
          className="jl-tool-slot no-underline"
          aria-label="Open admin"
        >
          <span className="jl-tool-slot-icon">
            <HudAdminIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">Admin</span>
        </AppLink>
      ) : null}
      <MotionPressable
        type="button"
        className={`jl-tool-slot${overlay.isChatOpen ? " jl-tool-slot-active" : ""}`}
        aria-label="Open chat"
        aria-pressed={overlay.isChatOpen}
        onClick={() =>
          overlay.isChatOpen ? overlay.closeSheet() : overlay.openChat()
        }
      >
        <span className="jl-tool-slot-label">Chat</span>
      </MotionPressable>
      <MotionPressable
        type="button"
        className={`jl-tool-slot${overlay.isLogOpen ? " jl-tool-slot-active" : ""}`}
        aria-label="Open session log"
        aria-pressed={overlay.isLogOpen}
        onClick={() =>
          overlay.isLogOpen ? overlay.closeSheet() : overlay.openLog()
        }
      >
        <span className="jl-tool-slot-label">Log</span>
      </MotionPressable>
      {canOpenCodes ? (
        <MotionPressable
          type="button"
          className={`jl-tool-slot${overlay.isCodesOpen ? " jl-tool-slot-active" : ""}`}
          aria-label="Open role codes"
          aria-pressed={overlay.isCodesOpen}
          onClick={() =>
            overlay.isCodesOpen ? overlay.closeSheet() : overlay.openCodes()
          }
        >
          <span className="jl-tool-slot-icon">
            <HudStarIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">Codes</span>
        </MotionPressable>
      ) : null}
    </div>
  );

  const toolChrome = (
    <MapBottomChrome
      layout={isDesktop ? "rail" : "phone"}
      session={sessionIsland}
    />
  );

  const codesSheet =
    myUid && canOpenCodes ? (
      <RoleCodesSheet
        key={overlay.isCodesOpen ? "codes-open" : "codes-closed"}
        open={overlay.isCodesOpen}
        onClose={overlay.closeSheet}
        session={session}
        myUid={myUid}
        isHost={isHost}
      />
    ) : null;

  if (isDesktop && mapSlot) {
    const railActiveTab: ContextualRailTab | null =
      overlay.sheet === "log" ||
      overlay.sheet === "chat" ||
      overlay.sheet === "codes"
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
        case "codes":
          overlay.openCodes();
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
      <>
        <MapScreenChromeSlots
          header={statusBar}
          toolbar={toolChrome}
          mapSlot={mapSlot}
          contextual={
            <ContextualRail
              open={
                overlay.sheet === "log" ||
                overlay.sheet === "chat" ||
                overlay.sheet === "codes"
              }
              activeTab={railActiveTab}
              onClose={overlay.closeSheet}
              onSelectTab={handleSelectRailTab}
              tabs={["log", "chat"]}
            />
          }
        />
        {codesSheet}
      </>
    );
  }

  return (
    <>
      <MapScreenChromeSlots
        layout="fragments"
        header={statusBar}
        toolbar={toolChrome}
      />
      {codesSheet}
    </>
  );
}
