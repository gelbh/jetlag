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
  type NavRevealDirection,
} from "./revealRouteTransition";
import {
  RouteTransitionContext,
  type BeginTransitionOptions,
  type RouteLoadingReason,
  type RouteTransitionPhase,
} from "./routeTransitionContextInstance";
import {
  getSyncRouteReady,
  isRouteImportWarm,
} from "./routeWarmState";
import { routeReadinessKind } from "./useRouteScreenReady";

export type { BeginTransitionOptions, RouteTransitionPhase };

const READY_POLL_MS = 16;
const READY_TIMEOUT_MS = 15_000;
const OVERLAY_DEFER_MS = 150;

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
  const { animate } = useMotionProfile();
  const [phase, setPhase] = useState<RouteTransitionPhase>("idle");
  const [loadingReason, setLoadingReason] = useState<RouteLoadingReason | null>(
    null,
  );

  const phaseRef = useRef(phase);
  const screenReadyRef = useRef(true);
  const loadingTargetRef = useRef<string | null>(null);
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
  }, []);

  const waitForScreenReady = useCallback(async (): Promise<number> => {
    const startedAt = Date.now();
    const deadline = startedAt + READY_TIMEOUT_MS;
    let lastPathname = pathnameRef.current;

    while (Date.now() < deadline) {
      const currentPathname = pathnameRef.current;

      if (currentPathname !== lastPathname) {
        lastPathname = currentPathname;
        if (!getSyncRouteReady(currentPathname)) {
          screenReadyRef.current = false;
        }
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

      navigate(to, navigateOptions);

      if (transitionGenerationRef.current !== myGeneration) {
        return;
      }

      try {
        await revealRouteTransition(revealDirectionRef.current, animate);
      } catch {
        // Navigation succeeded; a failed reveal should not block the route.
      }
    },
    [animate, navigate],
  );

  const beginTransition = useCallback(
    async (to: To, options?: BeginTransitionOptions) => {
      const startedAt = Date.now();
      const targetPath = resolveNavigatePath(to);
      const destinationKey = resolveNavigateDestinationKey(to);
      const readinessKind = routeReadinessKind(targetPath);
      const warmChunk = !isLazyRoute(targetPath) || isRouteImportWarm(targetPath);
      const warmReady = getSyncRouteReady(targetPath);
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
        return;
      }

      if (warmChunk && warmReady) {
        loadingTargetRef.current = destinationKey;
        await runWarmTransition(to, targetPath, navigateOptions, myGeneration);

        if (transitionGenerationRef.current === myGeneration) {
          loadingTargetRef.current = null;
        }

        return;
      }

      loadingTargetRef.current = destinationKey;
      screenReadyRef.current = getSyncRouteReady(targetPath);
      setLoadingReason(loadingReasonForPath(targetPath));

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

        navigate(to, navigateOptions);

        const readyWaitMs = await waitForScreenReady();

        if (transitionGenerationRef.current !== myGeneration) {
          return;
        }

        if (overlayTimer !== undefined) {
          window.clearTimeout(overlayTimer);
          overlayTimer = undefined;
        }

        if (overlayShown) {
          phaseRef.current = "revealing";
          setPhase("revealing");
        }

        try {
          await revealRouteTransition(revealDirectionRef.current, animate);
        } catch {
          // Navigation succeeded; a failed reveal should not block the route.
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
          phaseRef.current = "idle";
          setPhase("idle");
          setLoadingReason(null);
        }
      }
    },
    [animate, navigate, runWarmTransition, waitForScreenReady],
  );

  const value = useMemo(
    () => ({
      phase,
      loadingReason,
      beginTransition,
      reportScreenReady,
    }),
    [phase, loadingReason, beginTransition, reportScreenReady],
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}
