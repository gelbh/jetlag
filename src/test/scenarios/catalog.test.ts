import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "../fixtures/dublinGameArea";
import { toLocalStorageSeed } from "./adapters/toLocalStorageSeed";
import { toUnitFixture } from "./adapters/toUnitFixture";
import { getScenario, listScenarios } from "./catalog";

describe("scenario catalog", () => {
  it("registers dublin-local-map with shared Dublin city game area", () => {
    const scenario = getScenario("dublin-local-map");
    expect(scenario.tags).toEqual(
      expect.arrayContaining(["unit", "e2e", "manual"]),
    );
    expect(scenario.session.gameArea).toEqual(DUBLIN_CITY_GAME_AREA);
    expect(scenario.entryPath).toBe("/map");
  });

  it("lists manual scenarios including dublin-local-map", () => {
    const manual = listScenarios({ tag: "manual" }).map((s) => s.id);
    expect(manual).toContain("dublin-local-map");
  });

  it("keeps a single Dublin city polygon coordinate literal in fixtures", () => {
    const cityFile = readFileSync(
      resolve(__dirname, "../fixtures/dublinGameArea.ts"),
      "utf8",
    );
    const e2eMap = readFileSync(
      resolve(__dirname, "../../../e2e/fixtures/map.ts"),
      "utf8",
    );
    // Multi-line polygon layout; assert the SW corner literal, not a one-line `[[…`.
    const corner = "[-6.45, 53.27]";
    expect(cityFile.includes(corner)).toBe(true);
    expect(e2eMap.includes(corner)).toBe(false);
  });

  it("toUnitFixture builds a local session matching defaults", () => {
    const { session, myRole } = toUnitFixture("dublin-local-map");
    expect(session.id).toBe(LOCAL_SESSION_ID);
    expect(session.code).toBe("TEST");
    expect(myRole).toBe("seeker");
  });

  it("toLocalStorageSeed writes zustand-shaped session blob", () => {
    const seed = toLocalStorageSeed("dublin-local-map");
    const parsed = JSON.parse(seed.sessionBlob) as {
      state: { session: { id: string; code: string }; myRole: string };
    };
    expect(parsed.state.session.id).toBe(LOCAL_SESSION_ID);
    expect(parsed.state.session.code).toBe("TEST");
    expect(parsed.state.myRole).toBe("seeker");
    expect(seed.clearTimer).toBe(true);
  });

  it("adapters do not import playwright", () => {
    const unitSrc = readFileSync(
      resolve(__dirname, "./adapters/toUnitFixture.ts"),
      "utf8",
    );
    const localSrc = readFileSync(
      resolve(__dirname, "./adapters/toLocalStorageSeed.ts"),
      "utf8",
    );
    expect(unitSrc).not.toMatch(/playwright/i);
    expect(localSrc).not.toMatch(/playwright/i);
  });
});
