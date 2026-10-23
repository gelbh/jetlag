import type { MapTool } from "../../../domain/map/mapToolTypes";

export type ToolSessionPhase = "idle" | "configuring" | "submitting" | "resolving" | "error";

export interface ToolSessionSubmitContext {
  setResolving: () => void;
}

export interface ToolSessionControls<TConfig> {
  phase: ToolSessionPhase;
  config: TConfig | null;
  error: string | null;
  open: (initial?: Partial<TConfig>) => void;
  close: () => void;
  setConfig: (updater: Partial<TConfig> | ((prev: TConfig) => TConfig)) => void;
  setError: (message: string | null) => void;
  submit: () => Promise<void>;
  runAction: (action: (ctx: ToolSessionSubmitContext) => Promise<void>) => Promise<void>;
  isBusy: boolean;
}

export interface UseToolSessionOptions<TConfig> {
  toolId: MapTool;
  createInitialConfig: () => TConfig;
  onSubmit: (config: TConfig, ctx: ToolSessionSubmitContext) => Promise<void>;
  onClose?: () => void;
}
