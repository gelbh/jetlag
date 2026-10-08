import { describe, expect, it } from "vitest";
import {
  GAME_SIZE_THRESHOLDS_SQ_KM,
  METRIC_HIDING_ZONE_RADIUS_METERS,
  METRIC_TENTACLE_LARGE_RADIUS_METERS,
  METRIC_TENTACLE_MEDIUM_RADIUS_METERS,
  radarPresetsMetersForGameSizeAndUnit,
  thermometerPresetsMetersForGameSizeAndUnit,
} from "@/domain/map/distancePresets";
import { LEARN_ROUTE_PATHS } from "@/domain/seo/learnRoutePaths";
import type { GameSize } from "@/domain/session/size/gameSize";
import {
  answerDeadlineMs,
  hidingPeriodMinutes,
  tentacleEnabledForGameSize,
} from "@/domain/session/size/gameSizeRules";
import { learnPageContent } from "./learnContent";
import type { LearnPageContent } from "./learnContentTypes";

// The copy is hand-written for readability; these checks fail when the game rules it quotes
// change, so the pages get updated with them.

const SIZES: GameSize[] = ["small", "medium", "large"];

function tableRows(content: LearnPageContent, caption: string): Map<string, string> {
  for (const section of content.sections) {
    for (const block of section.blocks ?? []) {
      if (block.kind === "table" && block.caption === caption) return new Map(block.rows);
    }
  }
  throw new Error(`No table "${caption}" on ${content.path}`);
}

function pageText(content: LearnPageContent): string {
  return JSON.stringify(content);
}

/** "500 m" / "15" style labels as the tables write them (km after the first metre value). */
function metricLabel(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${meters / 1000}`;
}

/** Distances first offered at `size` (the table lists additions per size). */
function newPresets(presetsFor: (size: GameSize) => readonly number[], size: GameSize) {
  const index = SIZES.indexOf(size);
  const previous = index > 0 ? presetsFor(SIZES[index - 1]!) : [];
  return presetsFor(size).filter((m) => !previous.includes(m));
}

describe("learn content", () => {
  it("keys every page by its own path", () => {
    for (const path of LEARN_ROUTE_PATHS) {
      expect(learnPageContent(path).path).toBe(path);
    }
  });

  it("quotes the radar distances per game size", () => {
    const rows = tableRows(learnPageContent("/tools/radar"), "Radar distances");
    for (const size of SIZES) {
      const row = rows.get(size[0]!.toUpperCase() + size.slice(1)) ?? "";
      for (const meters of newPresets(
        (s) => radarPresetsMetersForGameSizeAndUnit(s, "metric"),
        size,
      )) {
        expect(row, `${size} ${meters}`).toMatch(
          new RegExp(`(^|\\D)${metricLabel(meters)}(\\D|$)`),
        );
      }
    }
  });

  it("quotes the thermometer distances per game size", () => {
    const rows = tableRows(learnPageContent("/tools/thermometer"), "Thermometer distances");
    for (const size of SIZES) {
      const row = rows.get(size[0]!.toUpperCase() + size.slice(1)) ?? "";
      for (const meters of newPresets(
        (s) => thermometerPresetsMetersForGameSizeAndUnit(s, "metric"),
        size,
      )) {
        expect(row, `${size} ${meters}`).toMatch(
          new RegExp(`(^|\\D)${metricLabel(meters)}(\\D|$)`),
        );
      }
    }
  });

  it("quotes tentacle availability and radii", () => {
    const rows = tableRows(learnPageContent("/tools/tentacles"), "Tentacles categories");
    expect(tentacleEnabledForGameSize("small")).toBe(false);
    expect(rows.get("Small")).toBe("Not available");
    expect(rows.get("Medium")).toContain(`${METRIC_TENTACLE_MEDIUM_RADIUS_METERS / 1000} km`);
    expect(rows.get("Large")).toContain(`${METRIC_TENTACLE_LARGE_RADIUS_METERS / 1000} km`);
  });

  it("quotes the game size thresholds, hiding times and zone radii", () => {
    const sizes = tableRows(learnPageContent("/tools"), "Game size by play area");
    expect(sizes.get("Medium")).toContain(`${GAME_SIZE_THRESHOLDS_SQ_KM.medium} km²`);
    expect(sizes.get("Large")).toContain(
      `${GAME_SIZE_THRESHOLDS_SQ_KM.large.toLocaleString("en")} km²`,
    );

    const guide = tableRows(learnPageContent("/guide"), "Game sizes");
    expect(guide.get("Small")).toContain(`${hidingPeriodMinutes("small")} minutes`);
    expect(guide.get("Medium")).toContain(`${hidingPeriodMinutes("medium")} minutes`);
    expect(guide.get("Large")).toContain(`${hidingPeriodMinutes("large") / 60} hours`);
    expect(guide.get("Small")).toContain(`${METRIC_HIDING_ZONE_RADIUS_METERS.smallMedium} m`);
    expect(guide.get("Large")).toContain(`${METRIC_HIDING_ZONE_RADIUS_METERS.large / 1000} km`);
  });

  it("quotes the answer deadlines", () => {
    const minutes = (ms: number) => ms / 60_000;
    expect(minutes(answerDeadlineMs("radar", "medium"))).toBe(5);
    expect(minutes(answerDeadlineMs("photo", "small"))).toBe(10);
    expect(minutes(answerDeadlineMs("photo", "medium"))).toBe(10);
    expect(minutes(answerDeadlineMs("photo", "large"))).toBe(20);
    const tools = pageText(learnPageContent("/tools"));
    expect(tools).toContain("5 minutes to answer most questions");
    expect(tools).toContain("10 minutes in small and medium games and 20 minutes in large games");
    expect(pageText(learnPageContent("/tools/photo"))).toContain(
      "10 minutes in small and medium games, 20 minutes in large games",
    );
    expect(pageText(learnPageContent("/guide"))).toContain("usually has 5 minutes to answer");
  });
});
