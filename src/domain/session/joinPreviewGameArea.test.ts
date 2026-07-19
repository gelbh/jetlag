import { describe, expect, it } from "vitest";
import { ZERO_GAME_AREA } from "../geometry/geometry";
import {
  JOIN_PREVIEW_PLACEHOLDER_AREA,
  isPlaceholderGameArea,
} from "./joinPreviewGameArea";

describe("isPlaceholderGameArea", () => {
  it("detects join-preview and zero areas", () => {
    expect(isPlaceholderGameArea(JOIN_PREVIEW_PLACEHOLDER_AREA)).toBe(true);
    expect(isPlaceholderGameArea(ZERO_GAME_AREA)).toBe(true);
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
