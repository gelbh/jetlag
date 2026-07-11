import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HudToolIcon } from "../map/ToolIcons";
import { ToolStepper } from "../tools/shared/ToolStepper";
import { WizardSwipeSurface } from "../tools/shared/WizardSwipeSurface";
import { buildSteps, deriveStepStates } from "../tools/shared/toolStepUtils";
import type { TutorialStep } from "../../domain/tutorial/tutorialSections";
import {
  getTutorialSection,
  nextTutorialSectionId,
  type TutorialSectionId,
} from "../../domain/tutorial/tutorialSections";
import {
  getQuestionTutorial,
  nextQuestionTutorialId,
  type QuestionTutorialId,
} from "../../domain/tutorial/tutorialQuestions";
import { TutorialScreenshot } from "./TutorialScreenshot";
import { TutorialSplitScreenshot } from "./TutorialSplitScreenshot";

export interface TutorialWalkthrough {
  id: string;
  title: string;
  steps: TutorialStep[];
  kind: "section" | "question";
}

interface TutorialSectionWizardProps {
  section: TutorialWalkthrough;
  initialStepIndex?: number;
  reviewing?: boolean;
  onStepComplete: (stepIndex: number) => void;
  onBackFromStart: () => void;
  onFinish: () => void;
  finishLabel?: string;
  onOpenSection?: (sectionId: TutorialSectionId) => void;
  onOpenQuestionsHub?: () => void;
  onOpenQuestion?: (questionId: QuestionTutorialId) => void;
}

export function TutorialSectionWizard({
  section,
  initialStepIndex = 0,
  reviewing = false,
  onStepComplete,
  onBackFromStart,
  onFinish,
  finishLabel = "Tutorial hub",
  onOpenSection,
  onOpenQuestionsHub,
  onOpenQuestion,
}: TutorialSectionWizardProps) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const step = section.steps[stepIndex]!;
  const isLastStep = stepIndex >= section.steps.length - 1;

  const stepper = useMemo(() => {
    const states = deriveStepStates(section.steps.length, stepIndex);
    const steps = buildSteps(
      section.steps.map((item) => ({ id: item.id, label: item.title })),
      states,
    );
    return <ToolStepper steps={steps} labelClassName="mt-2" />;
  }, [section.steps, stepIndex]);

  const handleNext = () => {
    onStepComplete(stepIndex);
    if (isLastStep) {
      onFinish();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, section.steps.length - 1));
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      onBackFromStart();
      return;
    }
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const isQuestionTutorial = section.kind === "question";

  const nextSectionId = isQuestionTutorial
    ? null
    : nextTutorialSectionId(section.id as TutorialSectionId);
  const nextSection = nextSectionId ? getTutorialSection(nextSectionId) : null;

  const nextQuestionId = isQuestionTutorial
    ? nextQuestionTutorialId(section.id as QuestionTutorialId)
    : null;
  const nextQuestion = nextQuestionId ? getQuestionTutorial(nextQuestionId) : null;

  const showCoreFirstFinish = isLastStep && section.id === "core" && !reviewing;

  const navButtons = showCoreFirstFinish ? (
    <div className="shrink-0 space-y-2">
      <button
        type="button"
        onClick={() => onOpenQuestionsHub?.()}
        className="btn-primary min-h-12 w-full"
      >
        Questions
      </button>
      {nextSection ? (
        <button
          type="button"
          onClick={() => onOpenSection?.(nextSection.id)}
          className="btn-secondary min-h-12 w-full"
        >
          {nextSection.title}
        </button>
      ) : null}
      <Link to="/create" className="btn-secondary flex min-h-12 w-full items-center justify-center">
        Create session
      </Link>
      <button type="button" onClick={onFinish} className="home-feedback-link w-full">
        Back to tutorial hub
      </button>
    </div>
  ) : isLastStep ? (
    <div className="shrink-0 space-y-2">
      <div className="flex gap-2 pt-1">
        {stepIndex > 0 ? (
          <button type="button" onClick={handleBack} className="btn-secondary flex-1">
            Back
          </button>
        ) : null}
        {nextQuestion ? (
          <button
            type="button"
            onClick={() => onOpenQuestion?.(nextQuestion.id)}
            className="btn-primary flex-1"
          >
            {nextQuestion.title}
          </button>
        ) : nextSection ? (
          <button
            type="button"
            onClick={() => onOpenSection?.(nextSection.id)}
            className="btn-primary flex-1"
          >
            {nextSection.title}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onStepComplete(stepIndex);
            onFinish();
          }}
          className={
            nextQuestion || nextSection
              ? "btn-secondary flex-1"
              : "btn-primary min-h-12 flex-1"
          }
        >
          {finishLabel}
        </button>
      </div>
    </div>
  ) : (
    <div className="flex shrink-0 gap-2 pt-1">
      {stepIndex > 0 ? (
        <button type="button" onClick={handleBack} className="btn-secondary flex-1">
          Back
        </button>
      ) : null}
      <button type="button" onClick={handleNext} className="btn-primary flex-1">
        Next
      </button>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div className="space-y-0.5">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
            {section.title}
          </p>
          <h2 className="font-display text-balance text-xl font-bold uppercase leading-tight tracking-tight text-ink">
            {step.title}
          </h2>
        </div>

        {stepper}
      </div>

      <WizardSwipeSurface
        stepId={step.id}
        stepIndex={stepIndex}
        canGoBack
        canGoNext={!isLastStep}
        onBack={handleBack}
        onNext={handleNext}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {step.toolId ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-md border-2 border-border bg-surface-panel text-highlight">
                <HudToolIcon tool={step.toolId} className="size-4" />
              </span>
              {step.badge ? (
                <span className="font-mono text-xs font-bold tracking-wide text-ink-muted">
                  {step.badge}
                </span>
              ) : null}
            </div>
          ) : null}

          {step.splitCompare ? (
            <TutorialSplitScreenshot compare={step.splitCompare} />
          ) : null}

          {step.imageSrc ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <TutorialScreenshot
                src={step.imageSrc}
                alt={step.imageAlt}
                className={
                  step.id === "on-map" ? "object-contain object-center" : undefined
                }
                fill
              />
            </div>
          ) : null}

          <p className="line-clamp-4 shrink-0 text-pretty text-sm leading-snug text-ink-muted">
            {step.body}
          </p>
        </div>

        {navButtons}
      </WizardSwipeSurface>
    </div>
  );
}
