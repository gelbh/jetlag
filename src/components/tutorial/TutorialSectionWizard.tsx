import { useCallback, useMemo, useState } from "react";
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
import { TutorialInteractiveFooter } from "./TutorialInteractiveFooter";
import { TutorialScreenshot } from "./TutorialScreenshot";
import { TutorialSplitScreenshot } from "./TutorialSplitScreenshot";
import { TutorialInteractiveTool } from "./previews/TutorialInteractiveTool";
import { TutorialWizardSplitPanelPreview } from "./previews/TutorialWizardSplitPanelPreview";
import { TutorialMapPreview } from "./previews/TutorialMapPreview";
import { TutorialMapViewportProvider } from "../../hooks/tutorial/TutorialMapViewportContext";

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
  onCompleteEntireQuestion?: () => void;
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
  onCompleteEntireQuestion,
}: TutorialSectionWizardProps) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const step = section.steps[stepIndex]!;
  const isLastStep = stepIndex >= section.steps.length - 1;
  const isInteractiveStep = step.kind === "interactive-panel";
  const walkthroughSteps = useMemo(
    () => section.steps.filter((item) => item.kind !== "interactive-panel"),
    [section.steps],
  );
  const walkthroughStepIndex = useMemo(() => {
    if (isInteractiveStep) {
      return -1;
    }

    return walkthroughSteps.findIndex((item) => item.id === step.id);
  }, [isInteractiveStep, step.id, walkthroughSteps]);
  const isLastWalkthroughStep =
    !isInteractiveStep && walkthroughStepIndex >= walkthroughSteps.length - 1;

  const handleNext = useCallback(() => {
    onStepComplete(stepIndex);
    if (isLastStep) {
      onFinish();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, section.steps.length - 1));
  }, [isLastStep, onFinish, onStepComplete, section.steps.length, stepIndex]);

  const handleBack = useCallback(() => {
    if (stepIndex === 0) {
      onBackFromStart();
      return;
    }
    setStepIndex((current) => Math.max(current - 1, 0));
  }, [onBackFromStart, stepIndex]);

  const stepper = useMemo(() => {
    if (isInteractiveStep) {
      return null;
    }

    const states = deriveStepStates(walkthroughSteps.length, walkthroughStepIndex);
    const steps = buildSteps(
      walkthroughSteps.map((item) => ({ id: item.id, label: item.title })),
      states,
    );
    return (
      <ToolStepper
        steps={steps}
        showLabel={false}
        nav={{
          stepIndex: walkthroughStepIndex,
          stepCount: walkthroughSteps.length,
          canGoBack: walkthroughStepIndex > 0,
          canGoNext: !isLastWalkthroughStep,
          onBack: handleBack,
          onNext: handleNext,
        }}
      />
    );
  }, [
    walkthroughSteps,
    walkthroughStepIndex,
    isInteractiveStep,
    isLastWalkthroughStep,
    handleBack,
    handleNext,
  ]);

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

  const lastStepExtra = showCoreFirstFinish ? (
    <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center">
      <button
        type="button"
        onClick={() => onOpenQuestionsHub?.()}
        className="home-feedback-link text-xs"
      >
        Questions
      </button>
      {nextSection ? (
        <>
          <span className="text-ink-dim" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => onOpenSection?.(nextSection.id)}
            className="home-feedback-link text-xs"
          >
            {nextSection.title}
          </button>
        </>
      ) : null}
      <span className="text-ink-dim" aria-hidden>
        ·
      </span>
      <Link to="/create" className="home-feedback-link text-xs">
        Create session
      </Link>
      <span className="text-ink-dim" aria-hidden>
        ·
      </span>
      <button type="button" onClick={onFinish} className="home-feedback-link text-xs">
        Hub
      </button>
    </div>
  ) : isLastStep ? (
    <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center">
      {nextQuestion ? (
        <button
          type="button"
          onClick={() => onOpenQuestion?.(nextQuestion.id)}
          className="home-feedback-link text-xs"
        >
          {nextQuestion.title}
        </button>
      ) : nextSection ? (
        <button
          type="button"
          onClick={() => onOpenSection?.(nextSection.id)}
          className="home-feedback-link text-xs"
        >
          {nextSection.title}
        </button>
      ) : null}
      {(nextQuestion || nextSection) && (
        <span className="text-ink-dim" aria-hidden>
          ·
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          onStepComplete(stepIndex);
          onFinish();
        }}
        className="home-feedback-link text-xs"
      >
        {finishLabel}
      </button>
    </div>
  ) : null;

  const handleSeeWalkthrough = () => {
    onStepComplete(stepIndex);
    setStepIndex((current) => Math.min(current + 1, section.steps.length - 1));
  };

  const handleGotIt = () => {
    onCompleteEntireQuestion?.();
    onFinish();
  };

  const stepMedia = (() => {
    switch (step.kind) {
      case "interactive-panel":
        if (step.toolId && isQuestionTutorial) {
          return (
            <TutorialInteractiveTool
              toolId={section.id as QuestionTutorialId}
            />
          );
        }
        return null;
      case "split-panel-preview":
        if (step.toolId && step.splitPanelPreview && isQuestionTutorial) {
          return (
            <TutorialWizardSplitPanelPreview
              toolId={section.id as QuestionTutorialId}
              compare={step.splitPanelPreview}
            />
          );
        }
        return null;
      case "map-preview":
        if (step.toolId && step.mapPreviewVariant && isQuestionTutorial) {
          return (
            <TutorialMapPreview
              toolId={section.id as QuestionTutorialId}
              variant={step.mapPreviewVariant}
              compact={Boolean(step.splitPanelPreview)}
            />
          );
        }
        return null;
      default:
        if (step.splitCompare) {
          return <TutorialSplitScreenshot compare={step.splitCompare} />;
        }
        if (step.imageSrc) {
          return (
            <TutorialScreenshot
              src={step.imageSrc}
              alt={step.imageAlt}
              className={
                step.id === "on-map" ? "object-contain object-center" : undefined
              }
              fill
            />
          );
        }
        return null;
    }
  })();

  const interactiveFooter = (
    <TutorialInteractiveFooter
      onGotIt={handleGotIt}
      onSeeWalkthrough={handleSeeWalkthrough}
    />
  );

  const footer = isInteractiveStep ? (
    interactiveFooter
  ) : lastStepExtra ? (
    <div className="wizard-step-footer-extra text-center">{lastStepExtra}</div>
  ) : undefined;

  const wizardBody = (
    <div
      className={
        isInteractiveStep
          ? "tutorial-wizard tutorial-wizard-interactive grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-1.5 overflow-hidden"
          : "tutorial-wizard flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden"
      }
    >
      <div className="shrink-0 space-y-1.5 text-center">
        <div className="space-y-0.5">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
            {section.title}
          </p>
          <h2 className="font-display text-balance text-lg font-bold uppercase leading-tight tracking-tight text-ink">
            {step.title}
          </h2>
        </div>
        {stepper}
      </div>

      <WizardSwipeSurface
        stepId={step.id}
        stepIndex={stepIndex}
        canGoBack={!isInteractiveStep && stepIndex > 0}
        canGoNext={!isInteractiveStep && !isLastStep}
        onBack={handleBack}
        onNext={handleNext}
        swipeEnabled={!isInteractiveStep}
        footer={footer}
      >
        <div
          className={
            isInteractiveStep
              ? "tutorial-scroll flex min-h-0 flex-col gap-2 overflow-hidden"
              : "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
          }
        >
          {step.toolId ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-md border-2 border-border bg-surface-panel text-highlight">
                <HudToolIcon tool={step.toolId} className="size-3.5" />
              </span>
              {step.badge ? (
                <span className="font-mono text-[10px] font-bold tracking-wide text-ink-muted">
                  {step.badge}
                </span>
              ) : null}
            </div>
          ) : null}

          {isInteractiveStep ? (
            <>
              <p className="shrink-0 text-pretty text-sm leading-snug text-ink-muted">
                {step.body}
              </p>
              {stepMedia ? (
                <div className="tutorial-wizard-media tutorial-interactive-media min-h-0 w-full flex-1 self-stretch">
                  {stepMedia}
                </div>
              ) : null}
            </>
          ) : (
            <>
              {stepMedia ? (
                <div className="tutorial-wizard-media w-full min-h-[min(42dvh,16rem)] self-stretch">
                  {stepMedia}
                </div>
              ) : null}
              <p className="shrink-0 pt-1 text-pretty text-sm leading-snug text-ink-muted">
                {step.body}
              </p>
            </>
          )}
        </div>
      </WizardSwipeSurface>
    </div>
  );

  return isQuestionTutorial ? (
    <TutorialMapViewportProvider>{wizardBody}</TutorialMapViewportProvider>
  ) : (
    wizardBody
  );
}
