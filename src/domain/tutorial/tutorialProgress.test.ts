import { describe, expect, it } from "vitest";
import {
  defaultQuestionProgress,
  isQuestionTutorialComplete,
  markQuestionStepComplete,
  questionTutorialStartIndex,
} from "./tutorialQuestions";
import {
  isSectionComplete,
  markStepComplete,
  readTutorialProgress,
  sectionStartIndex,
  TUTORIAL_PROGRESS_KEY,
} from "./tutorialProgress";

describe("tutorialProgress", () => {
  it("marks core complete on final step", () => {
    const start = readTutorialProgress();
    const next = markStepComplete("core", 6, 7, start);
    expect(next.coreComplete).toBe(true);
    expect(next.core).toBe(6);
  });

  it("reports section completion", () => {
    const progress = {
      core: -1,
      tools: 1,
      hider: -1,
      extras: -1,
      coreComplete: false,
      questions: defaultQuestionProgress(),
    };
    expect(isSectionComplete("tools", 2, progress)).toBe(true);
    expect(isSectionComplete("core", 7, progress)).toBe(false);
  });

  it("starts completed sections at step zero for review", () => {
    const progress = {
      core: 6,
      tools: -1,
      hider: -1,
      extras: -1,
      coreComplete: true,
      questions: defaultQuestionProgress(),
    };
    expect(sectionStartIndex("core", 7, progress)).toBe(0);
    expect(sectionStartIndex("tools", 2, { ...progress, tools: 0 })).toBe(1);
  });
});

describe("tutorialQuestions progress", () => {
  it("tracks per-question walkthrough steps", () => {
    const start = readTutorialProgress();
    const next = markQuestionStepComplete("matching", 3, start);
    expect(next.questions.matching).toBe(2);
    expect(isQuestionTutorialComplete("matching", next)).toBe(true);
  });

  it("starts completed question tutorials at step zero for review", () => {
    const progress = {
      core: 6,
      tools: -1,
      hider: -1,
      extras: -1,
      coreComplete: true,
      questions: { ...defaultQuestionProgress(), matching: 2 },
    };
    expect(questionTutorialStartIndex("matching", progress)).toBe(0);
    expect(questionTutorialStartIndex("radar", progress)).toBe(0);
  });

  it("migrates legacy full-step question progress to walkthrough indices", () => {
    const legacy = {
      version: 1 as const,
      core: -1,
      tools: -1,
      hider: -1,
      extras: -1,
      coreComplete: false,
      questions: {
        ...defaultQuestionProgress(),
        matching: 3,
        radar: 0,
      },
    };
    localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(legacy));
    const migrated = readTutorialProgress();
    localStorage.removeItem(TUTORIAL_PROGRESS_KEY);
    expect(migrated.questions.matching).toBe(2);
    expect(migrated.questions.radar).toBe(-1);
  });
});
