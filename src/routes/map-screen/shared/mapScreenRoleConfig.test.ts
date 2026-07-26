import { describe, expect, it } from "vitest";
import type { MapScreenController } from "../useMapScreenController";
import {
  MAP_SCREEN_CONTROLLER_CORE_KEYS,
  MAP_SCREEN_ROLE_CONFIGS,
  getMapScreenRoleConfig,
  type MapScreenControllerCoreKey,
} from "./mapScreenRoleConfig";

describe("mapScreenRoleConfig", () => {
  it("keeps role-agnostic controller core keys stable", () => {
    expect(MAP_SCREEN_CONTROLLER_CORE_KEYS).toEqual([
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
    ]);
  });

  it("types every core key as a MapScreenController property", () => {
    type CoreOnController = {
      [K in MapScreenControllerCoreKey]: MapScreenController[K];
    };
    const probe: CoreOnController | null = null;
    expect(probe).toBeNull();
    expect(MAP_SCREEN_CONTROLLER_CORE_KEYS.length).toBeGreaterThan(10);
  });

  it("maps each role to a distinct auth/notification profile", () => {
    expect(getMapScreenRoleConfig("seeker")).toMatchObject({
      authMode: "seeker-remote",
      notificationRole: "seeker",
      showQuestionTools: true,
    });
    expect(getMapScreenRoleConfig("hider")).toMatchObject({
      authMode: "hider-anonymous",
      notificationRole: "hider",
      showQuestionTools: false,
    });
    expect(getMapScreenRoleConfig("observer")).toMatchObject({
      authMode: "hider-anonymous",
      notificationRole: "observer",
      liveActivityEnabled: false,
    });
    expect(getMapScreenRoleConfig("admin")).toMatchObject({
      authMode: "admin-permanent",
      notificationRole: "admin",
      exitPath: "/admin",
    });
    expect(Object.keys(MAP_SCREEN_ROLE_CONFIGS).sort()).toEqual([
      "admin",
      "hider",
      "observer",
      "seeker",
    ]);
  });
});
