import type { TutorialStep } from "./tutorialSections";
import { getTutorialSections } from "./tutorialSections";
import { getQuestionTutorials } from "./tutorialQuestions";

function collectPathsFromStep(step: TutorialStep, paths: Set<string>) {
  if (step.imageSrc) {
    paths.add(step.imageSrc);
  }

  if (step.splitCompare) {
    paths.add(step.splitCompare.leftSrc);
    paths.add(step.splitCompare.rightSrc);
  }
}

export function collectTutorialAssetPaths(): string[] {
  const paths = new Set<string>();

  for (const section of getTutorialSections()) {
    for (const step of section.steps) {
      collectPathsFromStep(step, paths);
    }
  }

  for (const question of getQuestionTutorials()) {
    for (const step of question.steps) {
      collectPathsFromStep(step, paths);
    }
  }

  return [...paths].sort();
}
