import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useLocation,
  useNavigate,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import { useMotionProfile } from "../hooks/useMotionProfile";
import { reportSlowRouteTransition } from "../services/core/sentry";
import {
  isLazyRoute,
  preloadRoute,
  resolveNavigateDestinationKey,
  resolveNavigatePath,
} from "./routePreloaders";
import {
  revealRouteTransition,
  setNavDirection,
  type NavRevealDirection,
} from "./revealRouteTransition";
import {
  RouteTransitionContext,
  type BeginTransitionOptions,
  type RouteLoadingReason,
  type RouteTransitionPhase,
} from "./routeTransitionContextInstance";
import { computeLoadingProgress, type RouteLoadingProgress } from "./routeLoadingSteps";
import {
  getSyncRouteReady,
  isRouteImportWarm,
  isWarmFastPathEligible,
} from "./routeWarmState";
import { routeReadinessKind } from "./useRouteScreenReady";

export type { BeginTransitionOptions, RouteTransitionPhase };

const READY_POLL_MS = 16;
const READY_TIMEOUT_MS = 15_000;
const OVERLAY_DEFER_MS = 150;
const ROUTE_OVERLAY_EXIT_MS = 200;

type RouteNavigateOptions = NavigateOptions & {
  viewTransition: false;
};

function toRevealDirection(
  direction: BeginTransitionOptions["direction"],
): NavRevealDirection {
  if (direction === "back") {
    return "back";
  }
  if (direction === "replace") {
    return "neutral";
  }
  return "forward";
}

function loadingReasonForPath(pathname: string): RouteLoadingReason {
  switch (routeReadinessKind(pathname)) {
    case "auth-bootstrap":
      return "sign-in";
    case "play-area":
      return "map";
    case "admin-auth":
      return "admin";
    case "premium":
      return "premium";
    case "layout":
      return "page";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { decorativeAnimate } = useMotionProfile();
  const [phase, setPhase] = useState<RouteTransitionPhase>("idle");
  const [loadingReason, setLoadingReason] = useState<RouteLoadingReason | null>(
    null,
  );
  const [loadingProgress, setLoadingProgress] = useState<RouteLoadingProgress | null>(
    null,
  );

  const phaseRef = useRef(phase);
  const screenReadyRef = useRef(true);
  const loadingTargetRef = useRef<string | null>(null);
  const loadingTargetPathRef = useRef<string | null>(null);
  const pathnameRef = useRef(location.pathname);
  const transitionGenerationRef = useRef(0);
  const revealDirectionRef = useRef<NavRevealDirection>("forward");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  const reportScreenReady = useCallback((ready: boolean) => {
    screenReadyRef.current = ready;
    const targetPath = loadingTargetPathRef.current;
    if (
      targetPath &&
      (phaseRef.current === "loading" || phaseRef.current === "revealing")
    ) {
      setLoadingProgress(computeLoadingProgress(targetPath, ready));
    }
  }, []);

  const waitForScreenReady = useCallback(async (): Promise<number> => {
    const startedAt = Date.now();
    const deadline = startedAt + READY_TIMEOUT_MS;
    let lastPathname = pathnameRef.current;
    const targetPath = loadingTargetPathRef.current;
    const myGeneration = transitionGenerationRef.current;

    while (Date.now() < deadline) {
      if (transitionGenerationRef.current !== myGeneration) {
        return Date.now() - startedAt;
      }
      const currentPathname = pathnameRef.current;

      if (currentPathname !== lastPathname) {
        lastPathname = currentPathname;
        if (!getSyncRouteReady(currentPathname)) {
          screenReadyRef.current = false;
        }
      }

      if (targetPath) {
        setLoadingProgress(
          computeLoadingProgress(targetPath, screenReadyRef.current),
        );
      }

      if (screenReadyRef.current) {
        return Date.now() - startedAt;
      }

      await delay(READY_POLL_MS);
    }

    return Date.now() - startedAt;
  }, []);

  const runWarmTransition = useCallback(
    async (
      to: To,
      targetPath: string,
      navigateOptions: RouteNavigateOptions,
      myGeneration: number,
    ) => {
      try {
        await preloadRoute(targetPath);
      } catch {
        // Warm-up only; the rendered lazy route retries chunk failures itself.
      }

      if (transitionGenerationRef.current !== myGeneration) {
        return;
      }

      try {
        await revealRouteTransition(
          revealDirectionRef.current,
          decorativeAnimate,
          () => navigate(to, navigateOptions),
        );
      } catch {
        // Navigation succeeded; a failed reveal should not block the route.
      }
    },
    [decorativeAnimate, navigate],
  );

  const beginTransition = useCallback(
    async (to: To, options?: BeginTransitionOptions) => {
      const startedAt = Date.now();
      const targetPath = resolveNavigatePath(to);
      const destinationKey = resolveNavigateDestinationKey(to);
      const readinessKind = routeReadinessKind(targetPath);
      const warmChunk = !isLazyRoute(targetPath) || isRouteImportWarm(targetPath);
      const warmReady = getSyncRouteReady(targetPath);
      const warmFastPath = isWarmFastPathEligible(targetPath);
      const navigateOptions: RouteNavigateOptions = {
        replace: options?.replace,
        state: options?.state,
        preventScrollReset: options?.preventScrollReset,
        relative: options?.relative,
        viewTransition: false,
      };

      if (
        phaseRef.current !== "idle" &&
        loadingTargetRef.current === destinationKey
      ) {
        return;
      }

      const myGeneration = ++transitionGenerationRef.current;
      revealDirectionRef.current = toRevealDirection(options?.direction);

      if (phaseRef.current !== "idle") {
        loadingTargetRef.current = destinationKey;
        try {
          await preloadRoute(targetPath);
        } catch {
          // Warm-up only; the rendered lazy route retries chunk failures itself.
        }

        if (transitionGenerationRef.current !== myGeneration) {
          return;
        }

        navigate(to, navigateOptions);
        phaseRef.current = "idle";
        setPhase("idle");
        setLoadingReason(null);
        setLoadingProgress(null);
        loadingTargetPathRef.current = null;
        return;
      }

      if (warmFastPath) {
        loadingTargetRef.current = destinationKey;
        await runWarmTransition(to, targetPath, navigateOptions, myGeneration);

        if (transitionGenerationRef.current === myGeneration) {
          loadingTargetRef.current = null;
        }

        return;
      }

      loadingTargetRef.current = destinationKey;
      loadingTargetPathRef.current = targetPath;
      screenReadyRef.current = getSyncRouteReady(targetPath);
      const syncReadyBeforeMount = screenReadyRef.current;
      setLoadingReason(loadingReasonForPath(targetPath));
      setLoadingProgress(
        computeLoadingProgress(targetPath, screenReadyRef.current),
      );

      let overlayTimer: number | undefined;
      let overlayShown = false;

      const showOverlay = () => {
        if (transitionGenerationRef.current !== myGeneration || overlayShown) {
          return;
        }

        overlayShown = true;
        phaseRef.current = "loading";
        setPhase("loading");
      };

      overlayTimer = window.setTimeout(showOverlay, OVERLAY_DEFER_MS);

      try {
        const preloadStartedAt = Date.now();
        try {
          await preloadRoute(targetPath);
        } catch {
          // Warm-up only; the rendered lazy route retries chunk failures itself.
        }
        const preloadMs = Date.now() - preloadStartedAt;

        if (transitionGenerationRef.current !== myGeneration) {
          return;
        }

        setLoadingProgress(
          computeLoadingProgress(targetPath, screenReadyRef.current),
        );

        let readyWaitMs = 0;

        if (syncReadyBeforeMount) {
          // Destination is already ready to commit: wrap navigate in the VT
          // so WebKit captures distinct before/after snapshots. The overlay
          // (if shown) may appear in the VT's root snapshot; it exits in
          // parallel with the transition rather than gating on it.
          if (overlayTimer !== undefined) {
            window.clearTimeout(overlayTimer);
            overlayTimer = undefined;
          }

          const revealPromise = revealRouteTransition(
            revealDirectionRef.current,
            decorativeAnimate,
            () => navigate(to, navigateOptions),
          ).catch(() => undefined);

          if (overlayShown) {
            phaseRef.current = "revealing";
            setPhase("revealing");
            await Promise.all([revealPromise, delay(ROUTE_OVERLAY_EXIT_MS)]);
          } else {
            await revealPromise;
          }
        } else {
          // Destination needs to mount before it can report ready (map/geo).
          // Navigate instantly under the overlay and reveal via the overlay's
          // own directional exit instead of an empty VT.
          setNavDirection(revealDirectionRef.current);
          navigate(to, navigateOptions);

          readyWaitMs = await waitForScreenReady();

          if (transitionGenerationRef.current !== myGeneration) {
            return;
          }

          setLoadingProgress(
            computeLoadingProgress(targetPath, screenReadyRef.current),
          );

          if (overlayTimer !== undefined) {
            window.clearTimeout(overlayTimer);
            overlayTimer = undefined;
          }

          if (overlayShown) {
            phaseRef.current = "revealing";
            setPhase("revealing");
            await delay(ROUTE_OVERLAY_EXIT_MS);
          }
        }

        reportSlowRouteTransition({
          preload_ms: preloadMs,
          ready_wait_ms: readyWaitMs,
          total_ms: Date.now() - startedAt,
          target_path: targetPath,
          final_path: pathnameRef.current,
          readiness_kind: readinessKind,
          warm_chunk: warmChunk,
          warm_ready: warmReady,
        });
      } finally {
        if (overlayTimer !== undefined) {
          window.clearTimeout(overlayTimer);
        }

        if (transitionGenerationRef.current === myGeneration) {
          loadingTargetRef.current = null;
          loadingTargetPathRef.current = null;
          phaseRef.current = "idle";
          setPhase("idle");
          setLoadingReason(null);
          setLoadingProgress(null);
        }
      }
    },
    [decorativeAnimate, navigate, runWarmTransition, waitForScreenReady],
  );

  const value = useMemo(
    () => ({
      phase,
      loadingReason,
      loadingProgress,
      beginTransition,
      reportScreenReady,
    }),
    [phase, loadingReason, loadingProgress, beginTransition, reportScreenReady],
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}
