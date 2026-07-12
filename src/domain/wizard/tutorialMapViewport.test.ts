import { describe, expect, it } from "vitest";
import { defaultTutorialMapViewport } from "./tutorialMapViewport";

describe("defaultTutorialMapViewport", () => {
  it("returns the Dublin fallback viewport", () => {
    const viewport = defaultTutorialMapViewport();
    expect(viewport.source).toBe("default");
    expect(viewport.label).toBe("Dublin");
    expect(viewport.gameArea.type).toBe("Polygon");
  });
});
