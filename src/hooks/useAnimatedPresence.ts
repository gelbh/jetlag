import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
} from "react";
import { useMotionProfile } from "./location/useMotionProfile";

export type PresencePhase = "closed" | "entering" | "open" | "exiting";

export interface UseAnimatedPresenceOptions {
  open: boolean;
  onClose: () => void;
  enterClass?: string;
  exitClass?: string;
  /** Enter animation duration; exit uses 75% of this. */
  durationMs?: number;
}

export interface UseAnimatedPresenceResult {
  mounted: boolean;
  phase: PresencePhase;
  animClass: string;
  requestClose: () => void;
  setAnimNode: RefCallback<HTMLElement>;
}

function exitDurationMs(durationMs: number): number {
  return Math.round(durationMs * 0.75);
}

export function useAnimatedPresence({
  open,
  onClose,
  enterClass = "hud-sheet-enter",
  exitClass = "hud-sheet-exit",
  durationMs = 280,
}: UseAnimatedPresenceOptions): UseAnimatedPresenceResult {
  const { animate } = useMotionProfile();
  const [phase, setPhase] = useState<PresencePhase>(() =>
    open ? (animate ? "entering" : "open") : "closed",
  );
  const animNodeRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const setAnimNode = useCallback<RefCallback<HTMLElement>>((node) => {
    animNodeRef.current = node;
  }, []);

  const finishClose = useCallback(() => {
    setPhase("closed");
    onCloseRef.current();
  }, []);

  const beginExit = useCallback(() => {
    if (!animate) {
      setPhase("closed");
      finishClose();
      return;
    }
    setPhase((current) => {
      if (current === "closed" || current === "exiting") {
        return current;
      }
      return "exiting";
    });
  }, [animate, finishClose]);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect -- sync mount phase to open prop */
      setPhase((current) => {
        if (current === "closed") {
          return animate ? "entering" : "open";
        }
        return current;
      });
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect -- sync exit phase when open becomes false */
    setPhase((current) => {
      if (current === "closed" || current === "exiting") {
        return current;
      }
      if (!animate) {
        queueMicrotask(() => finishClose());
        return "closed";
      }
      return "exiting";
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, animate, finishClose]);

  useEffect(() => {
    if (phase !== "entering") {
      return;
    }

    if (!animate) {
      queueMicrotask(() => setPhase("open"));
      return;
    }

    const node = animNodeRef.current;
    let done = false;
    const complete = () => {
      if (done) {
        return;
      }
      done = true;
      setPhase("open");
    };

    const onEnd = (event: AnimationEvent) => {
      if (event.target !== node) {
        return;
      }
      complete();
    };

    node?.addEventListener("animationend", onEnd);
    const timeoutId = window.setTimeout(complete, durationMs + 50);

    return () => {
      node?.removeEventListener("animationend", onEnd);
      window.clearTimeout(timeoutId);
    };
  }, [phase, animate, durationMs]);

  useEffect(() => {
    if (phase !== "exiting") {
      return;
    }

    if (!animate) {
      queueMicrotask(() => finishClose());
      return;
    }

    const node = animNodeRef.current;
    const exitMs = exitDurationMs(durationMs);
    let done = false;
    const complete = () => {
      if (done) {
        return;
      }
      done = true;
      finishClose();
    };

    const onEnd = (event: AnimationEvent) => {
      if (event.target !== node) {
        return;
      }
      complete();
    };

    node?.addEventListener("animationend", onEnd);
    const timeoutId = window.setTimeout(complete, exitMs + 50);

    return () => {
      node?.removeEventListener("animationend", onEnd);
      window.clearTimeout(timeoutId);
    };
  }, [phase, animate, durationMs, finishClose]);

  const requestClose = useCallback(() => {
    beginExit();
  }, [beginExit]);

  const animClass =
    phase === "entering"
      ? enterClass
      : phase === "exiting"
        ? exitClass
        : "";

  return {
    mounted: phase !== "closed",
    phase,
    animClass,
    requestClose,
    setAnimNode,
  };
}
