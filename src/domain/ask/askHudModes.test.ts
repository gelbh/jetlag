import { describe, expect, it } from "vitest";
import {
  activeModeCue,
  askHudCameraPaddingPx,
  askHudDefinition,
  askHudSurfaces,
  ASK_HUD_CAMERA_PADDING_PX,
  ASK_HUD_CAMERA_PADDING_RAIL_PX,
  canCommit,
  commitKind,
  cueExcludesCostTokens,
  isAskHudOwnedTool,
  primedCommitLabel,
  type AskHudReadiness,
  type AskHudSurface,
} from "./askHudModes";

function readiness(
  partial: Partial<AskHudReadiness> & { surface: AskHudSurface },
): AskHudReadiness {
  return {
    placementReady: false,
    configureReady: false,
    resolveReady: true,
    answerReady: true,
    awaitHiderAnswer: true,
    isSubmitting: false,
    ...partial,
  };
}

describe("askHudModes", () => {
  it("registers all ask surfaces with mode bodies", () => {
    expect(askHudSurfaces()).toEqual([
      "radar",
      "matching",
      "measuring",
      "thermometer",
      "tentacle",
      "photo",
      "hiding-zone-create",
      "hiding-zone-move",
    ]);
    expect(askHudDefinition("radar").modeBody).toBe("chipIsland");
    expect(askHudDefinition("matching").modeBody).toBe("catalogRail");
    expect(askHudDefinition("thermometer").modeBody).toBe("walkBanner");
    expect(askHudDefinition("hiding-zone-create").modeBody).toBe(
      "methodChipIsland",
    );
  });

  it("radar cue is verb-only and advances with placement + distance", () => {
    expect(
      activeModeCue({
        surface: "radar",
        placementReady: false,
        configureReady: false,
        resolveReady: true,
      }),
    ).toBe("TAP MAP TO SET CENTER");
    expect(
      activeModeCue({
        surface: "radar",
        placementReady: true,
        configureReady: false,
        resolveReady: true,
      }),
    ).toBe("PICK A DISTANCE");
    const primed = activeModeCue({
      surface: "radar",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
    });
    expect(primed).toBe("READY TO SEND");
    expect(cueExcludesCostTokens(primed)).toBe(true);
    expect(cueExcludesCostTokens("TAP MAP TO SET CENTER")).toBe(true);
    expect(cueExcludesCostTokens("RADAR · D2P1")).toBe(false);
  });

  it("matching cue steps category → resolve; no DnPm in cues", () => {
    expect(
      activeModeCue({
        surface: "matching",
        placementReady: false,
        configureReady: false,
        resolveReady: false,
      }),
    ).toBe("PICK CATEGORY");
    expect(
      activeModeCue({
        surface: "matching",
        placementReady: true,
        configureReady: true,
        resolveReady: false,
      }),
    ).toBe("RESOLVE ON MAP");
    for (const surface of askHudSurfaces()) {
      const cue = activeModeCue({
        surface,
        placementReady: false,
        configureReady: false,
        resolveReady: false,
      });
      expect(cueExcludesCostTokens(cue)).toBe(true);
    }
  });

  it("canCommit gates radar until center + distance (+ answer when solo)", () => {
    expect(
      canCommit(
        readiness({
          surface: "radar",
          placementReady: true,
          configureReady: false,
        }),
      ),
    ).toBe(false);
    expect(
      canCommit(
        readiness({
          surface: "radar",
          placementReady: true,
          configureReady: true,
          awaitHiderAnswer: true,
        }),
      ),
    ).toBe(true);
    expect(
      canCommit(
        readiness({
          surface: "radar",
          placementReady: true,
          configureReady: true,
          awaitHiderAnswer: false,
          answerReady: false,
        }),
      ),
    ).toBe(false);
    expect(
      canCommit(
        readiness({
          surface: "radar",
          placementReady: true,
          configureReady: true,
          awaitHiderAnswer: false,
          answerReady: true,
        }),
      ),
    ).toBe(true);
  });

  it("canCommit for matching/thermo requires resolveReady", () => {
    expect(
      canCommit(
        readiness({
          surface: "matching",
          placementReady: true,
          configureReady: true,
          resolveReady: false,
        }),
      ),
    ).toBe(false);
    expect(
      canCommit(
        readiness({
          surface: "matching",
          placementReady: true,
          configureReady: true,
          resolveReady: true,
        }),
      ),
    ).toBe(true);
    expect(
      canCommit(
        readiness({
          surface: "thermometer",
          placementReady: true,
          configureReady: true,
          resolveReady: false,
        }),
      ),
    ).toBe(false);
  });

  it("photo and zone canCommit rules", () => {
    expect(
      canCommit(
        readiness({
          surface: "photo",
          placementReady: true,
          configureReady: true,
        }),
      ),
    ).toBe(true);
    expect(
      canCommit(
        readiness({
          surface: "hiding-zone-create",
          configureReady: true,
          placementReady: false,
          answerReady: false,
          awaitHiderAnswer: false,
        }),
      ),
    ).toBe(false);
    expect(
      canCommit(
        readiness({
          surface: "hiding-zone-create",
          configureReady: true,
          placementReady: true,
          answerReady: false,
          awaitHiderAnswer: false,
        }),
      ),
    ).toBe(true);
  });

  it("commitKind send vs ask vs confirm vs endWalk", () => {
    expect(commitKind("radar", true)).toBe("send");
    expect(commitKind("radar", false)).toBe("ask");
    expect(commitKind("hiding-zone-create", true)).toBe("confirm");
    expect(commitKind("thermometer", true)).toBe("endWalk");
  });

  it("blocks commit when submitting or view-only", () => {
    expect(
      canCommit(
        readiness({
          surface: "radar",
          placementReady: true,
          configureReady: true,
          isSubmitting: true,
        }),
      ),
    ).toBe(false);
    expect(
      canCommit(
        readiness({
          surface: "radar",
          placementReady: true,
          configureReady: true,
          viewOnly: true,
        }),
      ),
    ).toBe(false);
  });

  it("primedCommitLabel includes DnPm only when armed", () => {
    expect(
      primedCommitLabel({
        kind: "send",
        costLabel: "D2P1",
        primed: true,
        cue: "READY TO SEND",
      }),
    ).toBe("SEND · D2P1");
    expect(
      primedCommitLabel({
        kind: "send",
        costLabel: "D2P1",
        primed: false,
        cue: "TAP MAP TO SET CENTER",
      }),
    ).toBe("SEND — SET CENTER FIRST");
    expect(isAskHudOwnedTool("radar")).toBe(true);
    expect(isAskHudOwnedTool("matching")).toBe(true);
    expect(isAskHudOwnedTool("tentacle")).toBe(true);
    expect(isAskHudOwnedTool("thermometer")).toBe(true);
    expect(isAskHudOwnedTool("photo")).toBe(true);
  });

  it("measuring cue waits for source pick before target", () => {
    expect(
      activeModeCue({
        surface: "measuring",
        placementReady: true,
        configureReady: false,
        resolveReady: false,
      }),
    ).toBe("PICK A SOURCE");
    expect(
      activeModeCue({
        surface: "measuring",
        placementReady: true,
        configureReady: true,
        resolveReady: false,
      }),
    ).toBe("SET YOUR TARGET");
  });

  it("catalog-rail tools get taller camera padding", () => {
    expect(askHudCameraPaddingPx("radar")).toBe(ASK_HUD_CAMERA_PADDING_PX);
    expect(askHudCameraPaddingPx("matching")).toBe(
      ASK_HUD_CAMERA_PADDING_RAIL_PX,
    );
    expect(askHudCameraPaddingPx("tentacle")).toBe(
      ASK_HUD_CAMERA_PADDING_RAIL_PX,
    );
    expect(askHudCameraPaddingPx("measuring")).toBe(
      ASK_HUD_CAMERA_PADDING_RAIL_PX,
    );
  });
});
