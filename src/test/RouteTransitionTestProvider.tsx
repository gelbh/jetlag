import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { useNavigate, type To } from "react-router-dom";
import type { BeginTransitionOptions, RouteTransitionPhase } from "../navigation/routeTransitionContextInstance";
import { RouteTransitionContext } from "../navigation/routeTransitionContextInstance";
import { revealRouteTransition } from "../navigation/revealRouteTransition";

/**
 * Fast path for unit tests: skip chunk preload, readiness polling, and motion.
 * Awaiting real `preloadRoute` under `--changed` / large suites races
 * `AppNavigate` redirects (empty body until CreateSession/MapScreen import finishes).
 */
export function RouteTransitionTestProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const screenReadyRef = useRef(true);

  const beginTransition = useCallback(
    async (to: To, options?: BeginTransitionOptions) => {
      screenReadyRef.current = true;
      const direction =
        options?.direction === "back"
          ? "back"
          : options?.direction === "replace"
            ? "neutral"
            : "forward";
      await revealRouteTransition(direction, false, () =>
        navigate(to, {
          replace: options?.replace,
          state: options?.state,
          preventScrollReset: options?.preventScrollReset,
          relative: options?.relative,
          viewTransition: false,
        }),
      );
    },
    [navigate],
  );

  const value = useMemo(
    () => ({
      phase: "idle" as RouteTransitionPhase,
      loadingReason: null,
      loadingProgress: null,
      beginTransition,
      reportScreenReady: (ready: boolean) => {
        screenReadyRef.current = ready;
      },
      resetStuckTransition: () => undefined,
    }),
    [beginTransition],
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}
