import { useEffect, useMemo, type ReactNode } from "react";
import type { GameArea } from "../../domain/map/annotations";
import { baseQuestionCostForTool } from "../../domain/map/mapTools";
import { questionCostBreakdown } from "../../domain/questions";
import type { QuestionTutorialId } from "../../domain/tutorial/tutorialQuestions";
import type { ToolPanelSandboxMode } from "../../components/tools/shared/toolPanelSandbox";
import {
  useTutorialInteractiveSession,
  type TutorialInteractiveSessionValue,
} from "./TutorialInteractiveSession";
import { useRegisterTutorialMapDraft } from "./TutorialInteractiveMapDraftContext";
import { useTutorialMapViewport } from "./TutorialMapViewportContext";
import { useTutorialQuestionCommit } from "./useTutorialQuestionCommit";

export interface TutorialSandboxOptions<F> {
  readOnly?: boolean;
  fixture?: F;
  initialWizardStepId?: string;
  syncWizardStep?: boolean;
  hideStepper?: boolean;
}

/** Wizard-related props shared by every tool panel rendered in a sandbox. */
export interface TutorialSandboxWizardProps {
  sandbox: ToolPanelSandboxMode;
}

export interface TutorialSandboxCommit {
  handleCommit: () => void;
  isSubmitting: boolean;
}

export interface TutorialSandboxContext<F> {
  fixture: F | undefined;
  readOnly: boolean;
  interactive: boolean;
  committed: boolean;
  session: TutorialInteractiveSessionValue | null;
  registerMapDraft: ReturnType<typeof useRegisterTutorialMapDraft>;
  gameArea: GameArea;
  costLabel: string;
  wizardProps: TutorialSandboxWizardProps;
}

interface TutorialSandboxBody<Extras> {
  canCommit: boolean;
  renderPanel: (commit: TutorialSandboxCommit) => ReactNode;
  extras?: Extras;
}

interface CreateTutorialSandboxConfig<F, Extras> {
  toolId: QuestionTutorialId;
  /** When true (default), the sandbox is only interactive inside a TutorialInteractiveSessionProvider. */
  requiresSession?: boolean;
  useSandboxBody: (context: TutorialSandboxContext<F>) => TutorialSandboxBody<Extras>;
}

/**
 * Shared plumbing for tutorial tool sandboxes: interactive-session wiring, map
 * draft registration, question cost label, commit simulation, and the common
 * embedded-wizard panel props. Tool-specific state and panel rendering live in
 * the per-tool `useSandboxBody`.
 */
export function createTutorialSandbox<F, Extras = Record<never, never>>({
  toolId,
  requiresSession = true,
  useSandboxBody,
}: CreateTutorialSandboxConfig<F, Extras>) {
  return function useTutorialSandbox(options: TutorialSandboxOptions<F> = {}) {
    const fixture = options.fixture;
    const readOnly = options.readOnly ?? false;
    const session = useTutorialInteractiveSession();
    const interactive = !readOnly && (!requiresSession || session !== null);
    const registerMapDraft = useRegisterTutorialMapDraft();
    const { viewport } = useTutorialMapViewport();
    const costLabel = useMemo(
      () => questionCostBreakdown(baseQuestionCostForTool(toolId), 0).label,
      [],
    );

    const commit = useTutorialQuestionCommit({ enabled: interactive });
    const locked = readOnly || commit.committed;

    const body = useSandboxBody({
      fixture,
      readOnly: locked,
      interactive,
      committed: commit.committed,
      session,
      registerMapDraft,
      gameArea: viewport.gameArea,
      costLabel,
      wizardProps: {
        sandbox: {
          readOnly: locked,
          initialWizardStepId: options.initialWizardStepId,
          syncWizardStep: options.syncWizardStep ?? false,
          hideStepper: options.hideStepper,
        },
      },
    });

    useEffect(() => {
      commit.syncCanCommit(body.canCommit);
    }, [body.canCommit, commit.syncCanCommit]);

    const panel = (
      <div
        data-tutorial-committed={commit.committed ? "true" : undefined}
        className={commit.committed ? "pointer-events-none select-none" : undefined}
      >
        {body.renderPanel({
          handleCommit: commit.handleCommit,
          isSubmitting: commit.isSubmitting,
        })}
      </div>
    );

    return { panel, ...(body.extras as Extras) };
  };
}
