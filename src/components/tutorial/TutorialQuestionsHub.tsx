import { HudToolIcon } from "../map/ToolIcons";
import {
  getQuestionTutorials,
  isQuestionTutorialComplete,
  questionTutorialStartIndex,
  questionsHubStatusLabel,
  type QuestionTutorialId,
} from "../../domain/tutorial/tutorialQuestions";
import type { TutorialProgress } from "../../domain/tutorial/tutorialProgress";

interface TutorialQuestionsHubProps {
  progress: TutorialProgress;
  onSelectQuestion: (questionId: QuestionTutorialId) => void;
  onBack: () => void;
}

function questionStatusLabel(
  questionId: QuestionTutorialId,
  stepCount: number,
  progress: TutorialProgress,
): string {
  if (isQuestionTutorialComplete(questionId, stepCount, progress)) {
    return "Complete";
  }
  const resume = questionTutorialStartIndex(questionId, stepCount, progress);
  if (resume > 0) {
    return `${resume}/${stepCount}`;
  }
  return `${stepCount} steps`;
}

export function TutorialQuestionsHub({
  progress,
  onSelectQuestion,
  onBack,
}: TutorialQuestionsHubProps) {
  const questions = getQuestionTutorials();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <button type="button" onClick={onBack} className={screenBackClassName}>
        ← Tutorial
      </button>

      <div className="shrink-0 space-y-1">
        <h1 className="tutorial-hub-heading font-display text-balance font-bold uppercase leading-[0.92] tracking-tight text-ink">
          Questions
        </h1>
        <p className="tutorial-hub-intro max-w-sm text-pretty text-ink-muted">
          Each question type has its own wizard flow and map result.
        </p>
      </div>

      <div className="tutorial-questions-grid">
        {questions.map((question) => {
          const complete = isQuestionTutorialComplete(
            question.id,
            question.steps.length,
            progress,
          );

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelectQuestion(question.id)}
              className="home-card-btn home-card-btn-secondary"
              aria-label={
                complete
                  ? `${question.title} — review`
                  : `${question.title} — ${questionStatusLabel(question.id, question.steps.length, progress)}`
              }
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-border bg-surface-panel text-highlight">
                  <HudToolIcon tool={question.id} className="size-3.5" />
                </span>
                {complete ? (
                  <span
                    className="font-mono text-xs text-status-success"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                ) : null}
                <span className="truncate">{question.title}</span>
              </span>
              <span className="home-card-btn-hint">
                {complete
                  ? "Review"
                  : questionStatusLabel(question.id, question.steps.length, progress)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="shrink-0 text-center font-mono text-[10px] text-ink-dim">
        {questionsHubStatusLabel(progress)}
      </p>
    </div>
  );
}

const screenBackClassName =
  "inline-flex min-h-11 w-fit shrink-0 items-center gap-1 px-1 font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:text-ink";
