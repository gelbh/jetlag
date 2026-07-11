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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <button type="button" onClick={onBack} className={screenBackClassName}>
        ← Tutorial
      </button>

      <div className="space-y-2">
        <h1 className="font-display text-balance text-[clamp(1.75rem,8vw,2.5rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
          Questions
        </h1>
        <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
          Each question type has its own wizard flow and map result after the hider answers.
        </p>
      </div>

      <div className="space-y-2.5">
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
              <span className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-md border-2 border-border bg-surface-panel text-highlight">
                  <HudToolIcon tool={question.id} className="size-4" />
                </span>
                {complete ? (
                  <span className="font-mono text-sm text-status-success" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                <span>{question.title}</span>
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

      <p className="text-center font-mono text-xs text-ink-dim">
        {questionsHubStatusLabel(progress)}
      </p>
    </div>
  );
}

const screenBackClassName =
  "inline-flex min-h-11 w-fit items-center gap-1 px-1 font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:text-ink";
