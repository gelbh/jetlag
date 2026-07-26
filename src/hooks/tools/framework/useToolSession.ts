import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ToolSessionControls,
  ToolSessionPhase,
  UseToolSessionOptions,
} from "./types";

function mergeConfig<TConfig>(
  base: TConfig,
  initial?: Partial<TConfig>,
): TConfig {
  if (!initial) {
    return base;
  }
  return { ...base, ...initial };
}

/**
 * Shared open/close/submit state machine for seeker tool hooks.
 * Tools keep domain-specific draft logic; this owns phase + submit lock + error.
 */
export function useToolSession<TConfig>({
  active,
  createInitialConfig,
  onSubmit,
  onClose,
}: UseToolSessionOptions<TConfig>): ToolSessionControls<TConfig> {
  const [phase, setPhase] = useState<ToolSessionPhase>("idle");
  const [config, setConfigState] = useState<TConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createInitialConfigRef = useRef(createInitialConfig);
  const onSubmitRef = useRef(onSubmit);
  const onCloseRef = useRef(onClose);
  const inFlightRef = useRef(false);
  const configRef = useRef<TConfig | null>(null);
  const phaseRef = useRef<ToolSessionPhase>("idle");

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
    setConfigState(next);
    setError(null);
    setPhase("configuring");
  }, []);

  const close = useCallback(() => {
    inFlightRef.current = false;
    configRef.current = null;
    setConfigState(null);
    setError(null);
    setPhase("idle");
    onCloseRef.current?.();
  }, []);

  const setConfig = useCallback(
    (updater: Partial<TConfig> | ((prev: TConfig) => TConfig)) => {
      setConfigState((prev) => {
        if (prev === null) {
          return prev;
        }
        const next =
          typeof updater === "function"
            ? updater(prev)
            : { ...prev, ...updater };
        configRef.current = next;
        return next;
      });
      if (phaseRef.current === "error") {
        setPhase("configuring");
      }
    },
    [],
  );

  const runAction = useCallback(
    async (action: (ctx: { setResolving: () => void }) => Promise<void>) => {
      if (inFlightRef.current || phaseRef.current === "idle") {
        return;
      }

      inFlightRef.current = true;
      setError(null);
      setPhase("submitting");

      try {
        await action({
          setResolving: () => {
            setPhase("resolving");
          },
        });
        setPhase("configuring");
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Something went wrong.";
        setError(message);
        setPhase("error");
      } finally {
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

  useEffect(() => {
    if (active) {
      if (phaseRef.current === "idle") {
        open();
      }
      return;
    }

    if (phaseRef.current !== "idle") {
      close();
    }
  }, [active, close, open]);

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
