import type { PlayerRole } from "../../../domain/session/playerRole";
import type { SessionAuthMode } from "../../../hooks/session/useSharedSessionScreen";

/** Map screen roles that share chrome/controller primitives. */
export type MapScreenRole = PlayerRole;

export type MapScreenRoleConfig = {
  role: MapScreenRole;
  authMode: SessionAuthMode;
  notificationRole: PlayerRole;
  liveActivityEnabled: boolean;
  exitPath: string;
  /** Status rail / game-over playerRole prop. */
  statusPlayerRole: PlayerRole;
  /** Seeker question dock + tool placement. */
  showQuestionTools: boolean;
};

/**
 * Role-agnostic keys every map-screen controller surface must expose.
 * Characterization baseline for Wave R3 — keep in sync with `useMapScreenCore`.
 */
export const MAP_SCREEN_CONTROLLER_CORE_KEYS = [
  "session",
  "gameArea",
  "myRole",
  "uid",
  "isHost",
  "annotations",
  "pendingQuestions",
  "timer",
  "timerSyncing",
  "canControlTimer",
  "overlay",
  "syncStatus",
  "distanceUnit",
  "effectiveBasemapStyle",
  "handleMapStyleChange",
  "center",
  "mapFocusBounds",
  "mapShellRef",
  "chromeHudRef",
  "suppressChromeHideRef",
  "seekerLocations",
  "chatMessages",
  "hasUnreadChat",
  "unreadCount",
  "isRemote",
  "lowPowerMode",
  "layerVisibility",
] as const;

export type MapScreenControllerCoreKey =
  (typeof MAP_SCREEN_CONTROLLER_CORE_KEYS)[number];

export const MAP_SCREEN_ROLE_CONFIGS: Record<MapScreenRole, MapScreenRoleConfig> =
  {
    seeker: {
      role: "seeker",
      authMode: "seeker-remote",
      notificationRole: "seeker",
      liveActivityEnabled: true,
      exitPath: "/",
      statusPlayerRole: "seeker",
      showQuestionTools: true,
    },
    hider: {
      role: "hider",
      authMode: "hider-anonymous",
      notificationRole: "hider",
      liveActivityEnabled: true,
      exitPath: "/",
      statusPlayerRole: "hider",
      showQuestionTools: false,
    },
    observer: {
      role: "observer",
      authMode: "hider-anonymous",
      notificationRole: "observer",
      liveActivityEnabled: false,
      exitPath: "/",
      statusPlayerRole: "observer",
      showQuestionTools: false,
    },
    admin: {
      role: "admin",
      authMode: "admin-permanent",
      notificationRole: "admin",
      liveActivityEnabled: false,
      exitPath: "/admin",
      statusPlayerRole: "admin",
      showQuestionTools: false,
    },
  };

export function getMapScreenRoleConfig(role: MapScreenRole): MapScreenRoleConfig {
  return MAP_SCREEN_ROLE_CONFIGS[role];
}
