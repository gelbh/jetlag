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
    <div className="tutorial-split-panel-stack flex w-full max-w-[min(100%,48.75rem)] flex-col gap-2">
      {toolId !== "photo" ? (
        <TutorialMapPreview toolId={toolId} variant="context" />
      ) : null}
      <div className="tutorial-split-panel-preview mx-auto grid w-full grid-cols-2 gap-2">
      <figure className="flex min-w-0 flex-col gap-1">
        <figcaption className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {compare.leftLabel}
        </figcaption>
        <div className="flex items-start justify-center">
          <TutorialToolPanelPreview
            toolId={toolId}
            compare={compare}
            side="left"
          />
        </div>
      </figure>
      <figure className="flex min-w-0 flex-col gap-1">
        <figcaption className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {compare.rightLabel}
        </figcaption>
        <div className="flex items-start justify-center">
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
