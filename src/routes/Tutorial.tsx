import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";
import { TutorialHub } from "../components/tutorial/TutorialHub";
import { TutorialQuestionsHub } from "../components/tutorial/TutorialQuestionsHub";
import { TutorialSectionWizard } from "../components/tutorial/TutorialSectionWizard";
import {
  getTutorialSection,
  type TutorialSectionId,
} from "../domain/tutorial/tutorialSections";
import {
  getQuestionTutorial,
  isQuestionTutorialComplete,
  questionTutorialStartIndex,
  type QuestionTutorialId,
} from "../domain/tutorial/tutorialQuestions";
import {
  isSectionComplete,
  sectionStartIndex,
} from "../domain/tutorial/tutorialProgress";
import { useTutorialProgress } from "../hooks/useTutorialProgress";

type TutorialView =
  | { mode: "hub" }
  | { mode: "questions" }
  | { mode: "section"; sectionId: TutorialSectionId }
  | { mode: "question"; questionId: QuestionTutorialId };

function initialView(coreComplete: boolean): TutorialView {
  return coreComplete ? { mode: "hub" } : { mode: "section", sectionId: "core" };
}

export function Tutorial() {
  const navigate = useNavigate();
  const { progress, completeStep, completeQuestionStep } = useTutorialProgress();
  const [view, setView] = useState<TutorialView>(() =>
    initialView(progress.coreComplete),
  );

  const activeSection = useMemo(() => {
    if (view.mode !== "section") {
      return null;
    }
    return getTutorialSection(view.sectionId);
  }, [view]);

  const activeQuestion = useMemo(() => {
    if (view.mode !== "question") {
      return null;
    }
    return getQuestionTutorial(view.questionId);
  }, [view]);

  const sectionStepIndex =
    activeSection && view.mode === "section"
      ? sectionStartIndex(
          view.sectionId,
          activeSection.steps.length,
          progress,
        )
      : 0;

  const questionStepIndex =
    activeQuestion && view.mode === "question"
      ? questionTutorialStartIndex(
          view.questionId,
          activeQuestion.steps.length,
          progress,
        )
      : 0;

  const reviewingSection =
    activeSection && view.mode === "section"
      ? isSectionComplete(
          view.sectionId,
          activeSection.steps.length,
          progress,
        )
      : false;

  const reviewingQuestion =
    activeQuestion && view.mode === "question"
      ? isQuestionTutorialComplete(
          view.questionId,
          activeQuestion.steps.length,
          progress,
        )
      : false;

  const finishSection = (sectionId: TutorialSectionId) => {
    const section = getTutorialSection(sectionId);
    completeStep(sectionId, section.steps.length - 1, section.steps.length);
  };

  const finishQuestion = (questionId: QuestionTutorialId) => {
    const question = getQuestionTutorial(questionId);
    completeQuestionStep(questionId, question.steps.length - 1);
  };

  const handleSelectSection = (sectionId: TutorialSectionId) => {
    setView({ mode: "section", sectionId });
  };

  const handleFinishSection = () => {
    if (view.mode === "section") {
      finishSection(view.sectionId);
    }
    setView({ mode: "hub" });
  };

  const handleFinishQuestion = () => {
    if (view.mode === "question") {
      finishQuestion(view.questionId);
    }
    setView({ mode: "questions" });
  };

  const handleBackFromStart = () => {
    if (view.mode === "section" && view.sectionId === "core" && !progress.coreComplete) {
      navigate("/");
      return;
    }
    if (view.mode === "question") {
      setView({ mode: "questions" });
      return;
    }
    setView({ mode: "hub" });
  };

  const headerBackLabel =
    view.mode === "section" && !progress.coreComplete
      ? "Home"
      : view.mode === "question" || view.mode === "questions"
        ? "Tutorial"
        : "Back";

  return (
    <EntryScreenLayout>
      <ScreenHeader backTo="/" backLabel={headerBackLabel} />
      <div className={`flex min-h-0 flex-1 flex-col gap-3 ${screenHeaderOffsetClassName}`}>
        {view.mode === "hub" ? (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
                Tutorial
              </h1>
              <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
                Learn the session flow, then walk through each question tool.
              </p>
            </div>
            <TutorialHub
              progress={progress}
              onSelectSection={handleSelectSection}
              onOpenQuestions={() => setView({ mode: "questions" })}
            />
          </>
        ) : view.mode === "questions" ? (
          <TutorialQuestionsHub
            progress={progress}
            onSelectQuestion={(questionId) =>
              setView({ mode: "question", questionId })
            }
            onBack={() => setView({ mode: "hub" })}
          />
        ) : activeSection ? (
          <TutorialSectionWizard
            key={`${activeSection.id}-${reviewingSection ? "review" : "progress"}`}
            section={{
              id: activeSection.id,
              title: activeSection.title,
              steps: activeSection.steps,
              kind: "section",
            }}
            initialStepIndex={sectionStepIndex}
            reviewing={reviewingSection}
            onStepComplete={(stepIndex) => {
              completeStep(activeSection.id, stepIndex, activeSection.steps.length);
            }}
            onBackFromStart={handleBackFromStart}
            onFinish={handleFinishSection}
            onOpenSection={(sectionId) => {
              finishSection(activeSection.id);
              setView({
                mode: "section",
                sectionId: sectionId as TutorialSectionId,
              });
            }}
            onOpenQuestionsHub={() => {
              finishSection("core");
              setView({ mode: "questions" });
            }}
          />
        ) : activeQuestion ? (
          <TutorialSectionWizard
            key={`${activeQuestion.id}-${reviewingQuestion ? "review" : "progress"}`}
            section={{
              id: activeQuestion.id,
              title: activeQuestion.title,
              steps: activeQuestion.steps,
              kind: "question",
            }}
            initialStepIndex={questionStepIndex}
            reviewing={reviewingQuestion}
            finishLabel="All questions"
            onStepComplete={(stepIndex) => {
              completeQuestionStep(activeQuestion.id, stepIndex);
            }}
            onBackFromStart={handleBackFromStart}
            onFinish={handleFinishQuestion}
            onOpenQuestion={(questionId) => {
              finishQuestion(activeQuestion.id);
              setView({ mode: "question", questionId });
            }}
          />
        ) : null}
      </div>
    </EntryScreenLayout>
  );
}
