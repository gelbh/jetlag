import { AppLink } from "../navigation/AppLink";
import {
  getTutorialSections,
  type TutorialSection,
  type TutorialSectionId,
} from "../../domain/tutorial/tutorialSections";
import {
  isQuestionsHubComplete,
  questionsHubStatusLabel,
} from "../../domain/tutorial/tutorialQuestions";
import {
  isSectionComplete,
  sectionResumeIndex,
  type TutorialProgress,
} from "../../domain/tutorial/tutorialProgress";

interface TutorialHubProps {
  progress: TutorialProgress;
  onSelectSection: (sectionId: TutorialSectionId) => void;
  onOpenQuestions: () => void;
}

function sectionStatusLabel(
  section: TutorialSection,
  progress: TutorialProgress,
): string {
  if (isSectionComplete(section.id, section.steps.length, progress)) {
    return "Complete";
  }
  const resume = sectionResumeIndex(section.id, progress);
  if (resume > 0) {
    return `${resume}/${section.steps.length}`;
  }
  return `${section.steps.length} steps`;
}

export function TutorialHub({
  progress,
  onSelectSection,
  onOpenQuestions,
}: TutorialHubProps) {
  const sections = getTutorialSections();
  const coreSection = sections.find((section) => section.id === "core");
  const otherSections = sections.filter((section) => section.id !== "core");
  const questionsComplete = isQuestionsHubComplete(progress);
  const questionsLocked = !progress.coreComplete;

  const renderSectionButton = (section: TutorialSection) => {
    const complete = isSectionComplete(
      section.id,
      section.steps.length,
      progress,
    );
    const isCore = section.id === "core";
    const locked =
      section.recommendedAfter === "core" && !progress.coreComplete;

    return (
      <button
        key={section.id}
        type="button"
        disabled={locked}
        onClick={() => onSelectSection(section.id)}
        className={
          isCore && !complete
            ? "home-card-btn home-card-btn-primary disabled:opacity-40"
            : "home-card-btn home-card-btn-secondary disabled:opacity-40"
        }
        aria-label={
          locked
            ? `${section.title} — finish Core first`
            : complete
              ? `${section.title} — review`
              : `${section.title} — ${sectionStatusLabel(section, progress)}`
        }
      >
        <span className="flex items-center gap-2">
          {complete ? (
            <span className="font-mono text-sm text-status-success" aria-hidden="true">
              ✓
            </span>
          ) : null}
          <span>{section.title}</span>
        </span>
        <span className="home-card-btn-hint">
          {locked
            ? "Finish Core first"
            : complete
              ? "Review"
              : sectionStatusLabel(section, progress)}
        </span>
      </button>
    );
  };

  return (
    <div className="tutorial-hub">
      {coreSection ? renderSectionButton(coreSection) : null}

      <button
        type="button"
        disabled={questionsLocked}
        onClick={onOpenQuestions}
        className="home-card-btn home-card-btn-secondary disabled:opacity-40"
        aria-label={
          questionsLocked
            ? "Questions — finish Core first"
            : questionsComplete
              ? "Questions — review"
              : `Questions — ${questionsHubStatusLabel(progress)}`
        }
      >
        <span className="flex items-center gap-2">
          {questionsComplete ? (
            <span className="font-mono text-sm text-status-success" aria-hidden="true">
              ✓
            </span>
          ) : null}
          <span>Questions</span>
        </span>
        <span className="home-card-btn-hint">
          {questionsLocked
            ? "Finish Core first"
            : questionsComplete
              ? "Review"
              : questionsHubStatusLabel(progress)}
        </span>
      </button>

      <div className="tutorial-hub-sections">
        {otherSections.map(renderSectionButton)}
      </div>

      <AppLink to="/create" className="home-card-btn home-card-btn-primary">
        <span>Create session</span>
        <span className="home-card-btn-hint">Start hosting</span>
      </AppLink>
    </div>
  );
}
