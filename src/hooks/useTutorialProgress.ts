import { useCallback, useEffect, useState } from "react";
import {
  markStepComplete,
  readTutorialProgress,
  writeTutorialProgress,
  type TutorialProgress,
} from "../domain/tutorial/tutorialProgress";
import {
  markQuestionStepComplete,
  type QuestionTutorialId,
} from "../domain/tutorial/tutorialQuestions";
import type { TutorialSectionId } from "../domain/tutorial/tutorialSections";

export function useTutorialProgress() {
  const [progress, setProgress] = useState(() => readTutorialProgress());

  useEffect(() => {
    const onStorage = () => {
      setProgress(readTutorialProgress());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const completeStep = useCallback(
    (sectionId: TutorialSectionId, stepIndex: number, stepCount: number) => {
      setProgress((current) => {
        const next = markStepComplete(sectionId, stepIndex, stepCount, current);
        writeTutorialProgress(next);
        return next;
      });
    },
    [],
  );

  const completeQuestionStep = useCallback(
    (questionId: QuestionTutorialId, stepIndex: number) => {
      setProgress((current) => {
        const next = markQuestionStepComplete(questionId, stepIndex, current);
        writeTutorialProgress(next);
        return next;
      });
    },
    [],
  );

  const replaceProgress = useCallback((next: TutorialProgress) => {
    writeTutorialProgress(next);
    setProgress(next);
  }, []);

  return {
    progress,
    completeStep,
    completeQuestionStep,
    setProgress: replaceProgress,
  };
}
