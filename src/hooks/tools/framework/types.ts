export type ToolSessionPhase =
  | "idle"
  | "configuring"
  | "submitting"
  | "resolving"
  | "error";

export interface ToolSessionSubmitContext {
  /** Mark an in-flight resolve (e.g. Overpass) while submit orchestration owns the lock. */
  setResolving: () => void;
}

export interface ToolSessionControls<TConfig> {
  phase: ToolSessionPhase;
  config: TConfig | null;
  error: string | null;
  open: (initial?: Partial<TConfig>) => void;
  close: () => void;
  setConfig: (
    updater: Partial<TConfig> | ((prev: TConfig) => TConfig),
  ) => void;
  setError: (message: string | null) => void;
  submit: () => Promise<void>;
  /** Run an async tool action under the shared submit/resolve lock. */
  runAction: (
    action: (ctx: ToolSessionSubmitContext) => Promise<void>,
  ) => Promise<void>;
  /** True while phase is submitting or resolving. */
  isBusy: boolean;
}

export interface UseToolSessionOptions<TConfig> {
  toolId: string;
  active: boolean;
  createInitialConfig: () => TConfig;
  onSubmit: (
    config: TConfig,
    ctx: ToolSessionSubmitContext,
  ) => Promise<void>;
  onClose?: () => void;
}
