import type { TutorialSectionId } from "./tutorialSections";
import {
  defaultQuestionProgress,
  type QuestionTutorialId,
} from "./tutorialQuestions";

export const TUTORIAL_PROGRESS_KEY = "jetlag.tutorialProgress";

export interface TutorialProgress {
  core: number;
  tools: number;
  hider: number;
  extras: number;
  coreComplete: boolean;
  questions: Record<QuestionTutorialId, number>;
}

const EMPTY_PROGRESS: TutorialProgress = {
  core: -1,
  tools: -1,
  hider: -1,
  extras: -1,
  coreComplete: false,
  questions: defaultQuestionProgress(),
};

function normalizeQuestions(
  value: unknown,
): Record<QuestionTutorialId, number> {
  const base = defaultQuestionProgress();
  if (!value || typeof value !== "object") {
    return base;
  }
  const record = value as Partial<Record<QuestionTutorialId, number>>;
  for (const id of Object.keys(base) as QuestionTutorialId[]) {
    if (typeof record[id] === "number") {
      base[id] = record[id]!;
    }
  }
  return base;
}

export function readTutorialProgress(): TutorialProgress {
  try {
    const raw = localStorage.getItem(TUTORIAL_PROGRESS_KEY);
    if (!raw) {
      return { ...EMPTY_PROGRESS, questions: defaultQuestionProgress() };
    }
    const parsed = JSON.parse(raw) as Partial<TutorialProgress>;
    return {
      core: typeof parsed.core === "number" ? parsed.core : -1,
      tools: typeof parsed.tools === "number" ? parsed.tools : -1,
      hider: typeof parsed.hider === "number" ? parsed.hider : -1,
      extras: typeof parsed.extras === "number" ? parsed.extras : -1,
      coreComplete: parsed.coreComplete === true,
      questions: normalizeQuestions(parsed.questions),
    };
  } catch {
    return { ...EMPTY_PROGRESS, questions: defaultQuestionProgress() };
  }
}

export function writeTutorialProgress(progress: TutorialProgress): void {
  try {
    localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable
  }
}

export function isSectionComplete(
  sectionId: TutorialSectionId,
  stepCount: number,
  progress: TutorialProgress,
): boolean {
  if (sectionId === "core") {
    return progress.coreComplete;
  }
  return progress[sectionId] >= stepCount - 1;
}

export function sectionResumeIndex(
  sectionId: TutorialSectionId,
  progress: TutorialProgress,
): number {
  const last = progress[sectionId];
  if (last < 0) {
    return 0;
  }
  return last + 1;
}

/** First step when opening a section: resume mid-flow, or step 0 when reviewing a completed section. */
export function sectionStartIndex(
  sectionId: TutorialSectionId,
  stepCount: number,
  progress: TutorialProgress,
): number {
  if (isSectionComplete(sectionId, stepCount, progress)) {
    return 0;
  }
  return Math.min(sectionResumeIndex(sectionId, progress), stepCount - 1);
}

export function markStepComplete(
  sectionId: TutorialSectionId,
  stepIndex: number,
  stepCount: number,
  progress: TutorialProgress,
): TutorialProgress {
  const next: TutorialProgress = {
    ...progress,
    [sectionId]: Math.max(progress[sectionId], stepIndex),
  };
  if (sectionId === "core" && stepIndex >= stepCount - 1) {
    next.coreComplete = true;
  }
  return next;
}
