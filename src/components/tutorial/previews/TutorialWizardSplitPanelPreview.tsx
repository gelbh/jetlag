import type { TutorialSplitPanelPreview } from "../../../domain/tutorial/tutorialSections";
import type { QuestionTutorialId } from "../../../domain/tutorial/tutorialQuestions";
import { TutorialMapPreview } from "./TutorialMapPreview";
import { TutorialToolPanelPreview } from "./TutorialToolPanelPreview";

interface TutorialWizardSplitPanelPreviewProps {
  toolId: QuestionTutorialId;
  compare: TutorialSplitPanelPreview;
}

export function TutorialWizardSplitPanelPreview({
  toolId,
  compare,
}: TutorialWizardSplitPanelPreviewProps) {
  return (
    <div className="tutorial-split-panel-stack flex w-full max-w-[min(100%,48.75rem)] min-h-0 flex-1 flex-col gap-2">
      {toolId !== "photo" ? (
        <TutorialMapPreview toolId={toolId} variant="context" compact />
      ) : null}
      <div className="tutorial-split-panel-preview mx-auto grid min-h-0 w-full flex-1 grid-cols-2 gap-2">
        <figure className="tutorial-split-card flex min-h-0 min-w-0 flex-col gap-1">
          <figcaption className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
            {compare.leftLabel}
          </figcaption>
          <div className="tutorial-split-card-body flex min-h-0 flex-1 items-start justify-center overflow-y-auto">
            <TutorialToolPanelPreview
              toolId={toolId}
              compare={compare}
              side="left"
            />
          </div>
        </figure>
        <figure className="tutorial-split-card flex min-h-0 min-w-0 flex-col gap-1">
          <figcaption className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
            {compare.rightLabel}
          </figcaption>
          <div className="tutorial-split-card-body flex min-h-0 flex-1 items-start justify-center overflow-y-auto">
            <TutorialToolPanelPreview
              toolId={toolId}
              compare={compare}
              side="right"
            />
          </div>
        </figure>
      </div>
    </div>
  );
}
