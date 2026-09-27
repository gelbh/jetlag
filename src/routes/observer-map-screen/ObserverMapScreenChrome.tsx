import type { ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import { AppLink } from "../../components/navigation/AppLink";
import { ContextualRail } from "../../components/map/chrome/ContextualRail";
import type { ContextualRailTab } from "../../components/map/chrome/ContextualRailContext";
import { MapBottomChrome } from "../../components/map/chrome/MapBottomChrome";
import { MapChromeControl } from "../../components/map/chrome/MapChromeControl";
import { MapStatusRail } from "../../components/session/mapChrome/MapStatusRail";
import { RoleCodesSheet } from "../../components/session/settings/RoleCodesSheet";
import {
  HudAdminIcon,
  HudHomeIcon,
  HudStarIcon,
} from "../../components/ui/brand/HudIcons";
import {
  desktopOpsStatusExpandedStyle,
  mapToolSlotIconStyle,
  mapToolSlotLabelStyle,
  mapToolSlotStyles,
} from "@/components/ui/entry/entryChrome";
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
  moveInProgress?: boolean;
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
  moveInProgress = false,
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
    <div style={isDesktop ? desktopOpsStatusExpandedStyle : undefined}>
      <MapStatusRail
        model={{
          sessionCode: session.code,
          sessionId: session.id,
          roleGates: session.roleGates,
          sessionRules: session,
          playerRole: roleConfig.statusPlayerRole,
          activeTool: "none",
          syncStatus: "synced",
          queuedWrites: 0,
          timerState: timer.timerState,
          timerRunning: timer.running,
          timerHasStarted: timer.hasStarted,
          canStartGame: false,
          onStartGame: () => undefined,
          onTimerStart: () => undefined,
          onTimerPause: () => undefined,
          onTimerReset: () => undefined,
          timerControlsDisabled: true,
          moveInProgress,
          expanded: isDesktop,
          myUid,
          isHost,
        }}
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
    <div className="jl-tool-dock-group jl-tool-dock-group-secondary flex w-full min-w-0 flex-col justify-start gap-1">
      {isAdmin ? (
        <UnstyledButton
          component={AppLink}
          to="/admin"
          className="jl-tool-slot no-underline"
          styles={mapToolSlotStyles(false)}
          aria-label="Open admin"
        >
          <span className="jl-tool-slot-icon" style={mapToolSlotIconStyle}>
            <HudAdminIcon className="h-5 w-5 shrink-0" />
          </span>
          <span data-ios-tool-label="" style={mapToolSlotLabelStyle}>
            Admin
          </span>
        </UnstyledButton>
      ) : null}
      <MapChromeControl
        variant="slot"
        pressed={overlay.isChatOpen}
        aria-label="Open chat"
        label="Chat"
        onClick={() =>
          overlay.isChatOpen ? overlay.closeSheet() : overlay.openChat()
        }
      />
      <MapChromeControl
        variant="slot"
        pressed={overlay.isLogOpen}
        aria-label="Open session log"
        label="Log"
        onClick={() =>
          overlay.isLogOpen ? overlay.closeSheet() : overlay.openLog()
        }
      />
      {canOpenCodes ? (
        <MapChromeControl
          variant="slot"
          pressed={overlay.isCodesOpen}
          aria-label="Open role codes"
          icon={<HudStarIcon className="h-5 w-5 shrink-0" />}
          label="Codes"
          onClick={() =>
            overlay.isCodesOpen ? overlay.closeSheet() : overlay.openCodes()
          }
        />
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
