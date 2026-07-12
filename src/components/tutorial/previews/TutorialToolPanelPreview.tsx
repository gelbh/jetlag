import type { QuestionTutorialId } from "../../../domain/tutorial/tutorialQuestions";
import { splitPanelWizardStepId } from "../../../domain/wizard/tutorialPreviewRegistry";
import type { TutorialSplitPanelPreview } from "../../../domain/tutorial/tutorialSections";
import { TUTORIAL_SANDBOX_HOOKS } from "../../../hooks/tutorial/tutorialSandboxRegistry";

interface TutorialToolPanelPreviewProps {
  toolId: QuestionTutorialId;
  compare: TutorialSplitPanelPreview;
  side: "left" | "right";
}

function SandboxPanelPreview({
  toolId,
  compare,
  side,
}: TutorialToolPanelPreviewProps) {
  const useSandbox = TUTORIAL_SANDBOX_HOOKS[toolId];
  const awaitHiderAnswer =
    side === "left"
      ? (compare.leftAwaitHiderAnswer ?? false)
      : (compare.rightAwaitHiderAnswer ?? true);
  const { panel } = useSandbox({
    readOnly: true,
    fixtureRequest: { kind: "split", awaitHiderAnswer },
    initialWizardStepId: splitPanelWizardStepId(toolId, compare, side),
    syncWizardStep: false,
  });

  return (
    <div className="tutorial-panel-preview hud-panel w-full max-w-xl overflow-visible p-2">
      {panel}
    </div>
  );
}

export function TutorialToolPanelPreview(props: TutorialToolPanelPreviewProps) {
  return <SandboxPanelPreview key={props.toolId} {...props} />;
}
