import { useCallback, useEffect, useRef, useState } from "react";
import { useMapStore } from "../../../state/mapStore";
import type { ToolSessionControls, ToolSessionPhase, UseToolSessionOptions } from "./types";

function mergeConfig<TConfig>(base: TConfig, initial?: Partial<TConfig>): TConfig {
  if (!initial) {
    return base;
  }
  return { ...base, ...initial };
}

export function useToolSession<TConfig>({
  toolId,
  createInitialConfig,
  onSubmit,
  onClose,
}: UseToolSessionOptions<TConfig>): ToolSessionControls<TConfig> {
  const [initialConfig] = useState(() =>
    useMapStore.getState().activeTool === toolId ? createInitialConfig() : null,
  );
  const initialPhase: ToolSessionPhase = initialConfig === null ? "idle" : "configuring";
  const [phase, setPhase] = useState<ToolSessionPhase>(initialPhase);
  const [config, setConfigState] = useState<TConfig | null>(initialConfig);
  const [error, setError] = useState<string | null>(null);

  const createInitialConfigRef = useRef(createInitialConfig);
  const onSubmitRef = useRef(onSubmit);
  const onCloseRef = useRef(onClose);
  const inFlightRef = useRef(false);
  const configRef = useRef<TConfig | null>(initialConfig);
  const phaseRef = useRef<ToolSessionPhase>(initialPhase);
  const sessionEpochRef = useRef(0);

  useEffect(() => {
    createInitialConfigRef.current = createInitialConfig;
  }, [createInitialConfig]);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const open = useCallback((initial?: Partial<TConfig>) => {
    const next = mergeConfig(createInitialConfigRef.current(), initial);
    configRef.current = next;
    phaseRef.current = "configuring";
    setConfigState(next);
    setError(null);
    setPhase("configuring");
  }, []);

  const close = useCallback(() => {
    sessionEpochRef.current += 1;
    inFlightRef.current = false;
    configRef.current = null;
    phaseRef.current = "idle";
    setConfigState(null);
    setError(null);
    setPhase("idle");
    onCloseRef.current?.();
  }, []);

  const setConfig = useCallback((updater: Partial<TConfig> | ((prev: TConfig) => TConfig)) => {
    const prev = configRef.current;
    if (prev === null) {
      return;
    }
    const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
    configRef.current = next;
    setConfigState(next);
    if (phaseRef.current === "error") {
      setPhase("configuring");
    }
  }, []);

  const runAction = useCallback(
    async (action: (ctx: { setResolving: () => void }) => Promise<void>) => {
      if (inFlightRef.current || phaseRef.current === "idle") {
        return;
      }

      const epoch = sessionEpochRef.current;
      inFlightRef.current = true;
      setError(null);
      setPhase("submitting");

      try {
        await action({
          setResolving: () => {
            if (sessionEpochRef.current === epoch) {
              setPhase("resolving");
            }
          },
        });
        if (sessionEpochRef.current === epoch) {
          setPhase("configuring");
        }
      } catch (caught) {
        if (sessionEpochRef.current === epoch) {
          const message = caught instanceof Error ? caught.message : "Something went wrong.";
          setError(message);
          setPhase("error");
        }
      }
      if (sessionEpochRef.current === epoch) {
        inFlightRef.current = false;
      }
    },
    [],
  );

  const submit = useCallback(async () => {
    const current = configRef.current;
    if (current === null) {
      return;
    }

    await runAction(async (ctx) => {
      await onSubmitRef.current(current, ctx);
    });
  }, [runAction]);

  // activeTool also changes outside React (session teardown), so follow the
  // store directly; updates land in the same render as the tool switch.
  useEffect(
    () =>
      useMapStore.subscribe((state, prev) => {
        if (state.activeTool === prev.activeTool) {
          return;
        }
        if (state.activeTool === toolId) {
          open();
        } else if (prev.activeTool === toolId) {
          close();
        }
      }),
    [close, open, toolId],
  );

  return {
    phase,
    config,
    error,
    open,
    close,
    setConfig,
    setError,
    submit,
    runAction,
    isBusy: phase === "submitting" || phase === "resolving",
  };
}
