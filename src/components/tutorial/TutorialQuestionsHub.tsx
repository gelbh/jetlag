import { Fragment } from "react";
import { HudToolIcon } from "../map/ToolIcons";
import {
  getQuestionTutorial,
  getQuestionTutorials,
  isQuestionTutorialComplete,
  QUESTION_TUTORIAL_ORDER,
  questionTutorialStartIndex,
  questionWalkthroughSteps,
  questionsHubStatusLabel,
  walkthroughIndexForFullStep,
  type QuestionTutorialId,
} from "../../domain/tutorial/tutorialQuestions";
import type { TutorialProgress } from "../../domain/tutorial/tutorialProgress";

interface TutorialQuestionsHubProps {
  progress: TutorialProgress;
  onSelectQuestion: (questionId: QuestionTutorialId) => void;
}

function questionStatusLabel(
  questionId: QuestionTutorialId,
  walkthroughCount: number,
  progress: TutorialProgress,
): string {
  if (isQuestionTutorialComplete(questionId, progress)) {
    return "Complete";
  }
  const resume = questionTutorialStartIndex(questionId, progress);
  const walkthroughIndex = walkthroughIndexForFullStep(
    getQuestionTutorial(questionId).steps,
    resume,
  );
  if (walkthroughIndex !== null && walkthroughIndex > 0) {
    return `${walkthroughIndex + 1}/${walkthroughCount}`;
  }
  return `${walkthroughCount} steps`;
}

export function TutorialQuestionsHub({
  progress,
  onSelectQuestion,
}: TutorialQuestionsHubProps) {
  const questions = getQuestionTutorials();
  const recommendedId = QUESTION_TUTORIAL_ORDER.find(
    (id) => !isQuestionTutorialComplete(id, progress),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0 space-y-1">
        <h1 className="tutorial-hub-heading font-display text-balance font-bold uppercase leading-[0.92] tracking-tight text-ink">
          Questions
        </h1>
        <p className="tutorial-hub-intro max-w-sm text-pretty text-ink-muted">
          Each question type has its own wizard flow and map result.
        </p>
      </div>

      <div className="tutorial-questions-list">
        {questions.map((question) => {
          const walkthroughCount = questionWalkthroughSteps(question.steps).length;
          const complete = isQuestionTutorialComplete(
            question.id,
            progress,
          );
          const status = complete
            ? "Review"
            : questionStatusLabel(question.id, walkthroughCount, progress);
          const completedSteps = complete
            ? walkthroughCount
            : Math.max(0, progress.questions[question.id] + 1);
          const progressPercent = Math.round(
            (completedSteps / walkthroughCount) * 100,
          );
          const isRecommended = question.id === recommendedId && !complete;

          return (
            <Fragment key={question.id}>
              <button
                type="button"
                onClick={() => onSelectQuestion(question.id)}
                className={`home-card-btn home-card-btn-secondary tutorial-question-row ${isRecommended ? "tutorial-question-row-recommended" : ""}`}
                aria-label={
                  complete
                    ? `${question.title} — review`
                    : `${question.title} — ${isRecommended ? "Continue" : status}`
                }
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-border bg-surface-panel text-highlight">
                    <HudToolIcon tool={question.id} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1.5">
                      {complete ? (
                        <span
                          className="font-mono text-sm text-status-success"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      ) : null}
                      <span className="truncate">{question.title}</span>
                    </span>
                    <span className="tutorial-question-summary block truncate normal-case tracking-normal">
                      {question.summary}
                    </span>
                  </span>
                </span>
                <span className="home-card-btn-hint shrink-0">
                  {isRecommended ? "Continue" : status}
                </span>
              </button>
              <div className="tutorial-question-progress" aria-hidden>
                <div
                  className="tutorial-question-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </Fragment>
          );
        })}
      </div>

      <p className="shrink-0 text-center font-mono text-[10px] text-ink-dim">
        {questionsHubStatusLabel(progress)}
      </p>
    </div>
  );
}
