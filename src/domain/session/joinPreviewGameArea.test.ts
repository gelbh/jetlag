import { describe, expect, it } from "vitest";
import {
  JOIN_PREVIEW_PLACEHOLDER_AREA,
  isPlaceholderGameArea,
} from "./joinPreviewGameArea";
import type { GameArea } from "../map/annotations";

const zeroFallback: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  ],
};

describe("isPlaceholderGameArea", () => {
  it("detects join-preview and zero areas", () => {
    expect(isPlaceholderGameArea(JOIN_PREVIEW_PLACEHOLDER_AREA)).toBe(true);
    expect(isPlaceholderGameArea(zeroFallback)).toBe(true);
    expect(
      isPlaceholderGameArea({
        type: "Polygon",
        coordinates: [
          [
            [10, 10],
            [11, 10],
            [11, 11],
            [10, 11],
            [10, 10],
          ],
        ],
      }),
    ).toBe(false);
  });
});
