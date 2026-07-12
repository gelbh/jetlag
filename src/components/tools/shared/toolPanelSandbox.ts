/**
 * Tutorial sandbox rendering mode for tool wizard panels. Absent on the live
 * map: panels render the full interactive wizard with a sticky answer footer.
 * When present, the wizard renders embedded (no sticky footer) and can be
 * frozen read-only or pinned to a specific step for split-screen previews.
 */
export interface ToolPanelSandboxMode {
  readOnly: boolean;
  initialWizardStepId?: string;
  /** Sync the wizard step with external tutorial state. Defaults to false. */
  syncWizardStep?: boolean;
}
