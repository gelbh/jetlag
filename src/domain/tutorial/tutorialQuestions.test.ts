import { describe, expect, it } from "vitest";
import {
  completedQuestionCount,
  getQuestionTutorial,
  getQuestionTutorials,
  isQuestionsHubComplete,
  markQuestionStepComplete,
} from "./tutorialQuestions";
import { readTutorialProgress } from "./tutorialProgress";

describe("tutorialQuestions", () => {
  it("uses live preview steps for every question tutorial", () => {
    for (const tutorial of getQuestionTutorials()) {
      expect(tutorial.steps[0]?.kind).toBe("interactive-panel");
      expect(
        tutorial.steps.find((step) => step.id === "session-mode")?.kind,
      ).toBe("split-panel-preview");
      expect(
        tutorial.steps.filter((step) => step.id.startsWith("wizard-")),
      ).toHaveLength(0);
    }
  });

  it("uses live map previews for map-based question tools", () => {
    for (const tutorial of getQuestionTutorials()) {
      if (tutorial.id === "photo") {
        continue;
      }
      const mapContext = tutorial.steps.find((step) => step.id === "map-context");
      const closeUp = tutorial.steps.find((step) => step.id === "on-map");
      expect(mapContext?.kind).toBe("map-preview");
      expect(closeUp?.kind).toBe("map-preview");
    }
  });

  it("reports questions hub completion", () => {
    let progress = readTutorialProgress();
    expect(isQuestionsHubComplete(progress)).toBe(false);
    for (const tutorial of getQuestionTutorials()) {
      progress = markQuestionStepComplete(
        tutorial.id,
        tutorial.steps.length - 1,
        progress,
      );
    }
    expect(completedQuestionCount(progress)).toBe(6);
    expect(isQuestionsHubComplete(progress)).toBe(true);
  });

  it("defines four steps for each live question walkthrough", () => {
    for (const tutorial of getQuestionTutorials()) {
      expect(tutorial.steps).toHaveLength(4);
      expect(getQuestionTutorial(tutorial.id).steps.length).toBe(4);
    }
  });
});
