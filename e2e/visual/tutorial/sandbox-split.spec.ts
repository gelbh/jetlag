import { test, expect } from "../../fixtures";
import {
  openQuestionTutorial,
  openSplitPanelStep,
} from "../../fixtures/tutorial-interactive";

const SPLIT_TOOLS = [
  {
    toolId: "matching",
    heading: "Solo vs hiders",
    snapshot: "matching-split.png",
  },
  {
    toolId: "measuring",
    heading: "Solo vs hiders",
    snapshot: "measuring-split.png",
  },
  {
    toolId: "thermometer",
    heading: "Solo vs hiders",
    snapshot: "thermometer-split.png",
  },
  {
    toolId: "radar",
    heading: "Solo vs hiders",
    snapshot: "radar-split.png",
  },
  {
    toolId: "tentacle",
    heading: "Solo vs hiders",
    snapshot: "tentacle-split.png",
  },
  {
    toolId: "photo",
    heading: "Hiders required",
    snapshot: "photo-split.png",
  },
];

test.describe("tutorial sandbox split-panel screenshots", () => {
  for (const { toolId, heading, snapshot } of SPLIT_TOOLS) {
    test(`${toolId} split panel matches baseline`, async ({ page }) => {
      await openQuestionTutorial(page, toolId);
      await openSplitPanelStep(page);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page).toHaveScreenshot(snapshot, {
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
