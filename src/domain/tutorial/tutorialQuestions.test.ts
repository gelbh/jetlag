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
  it("gives each wizard panel its own tutorial step with one screenshot", () => {
    const matching = getQuestionTutorial("matching");
    const wizardSteps = matching.steps.filter((step) =>
      step.id.startsWith("wizard-"),
    );
    expect(wizardSteps).toHaveLength(3);
    for (const step of wizardSteps) {
      expect(step.imageSrc).toContain("/tutorial/questions/matching/wizard/solo/");
      expect(step.splitCompare).toBeUndefined();
    }
    expect(matching.steps.every((step) => !("wizardShots" in step))).toBe(true);
  });

  it("defines six question tutorials with split, map context, and close-up steps", () => {
    const tutorials = getQuestionTutorials();
    expect(tutorials).toHaveLength(6);
    for (const tutorial of tutorials) {
      expect(tutorial.steps.find((step) => step.id === "session-mode")?.splitCompare)
        .toBeTruthy();
      expect(
        tutorial.steps.find((step) => step.id === "map-context")?.imageSrc,
      ).toContain("/tutorial/questions/");
      expect(tutorial.steps.find((step) => step.id === "on-map")?.imageSrc).toContain(
        "/tutorial/questions/",
      );
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
});
