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
  type To,
} from "react-router-dom";
import { useMotionProfile } from "../hooks/useMotionProfile";
import {
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
  type RouteTransitionPhase,
} from "./routeTransitionContextInstance";

export type { BeginTransitionOptions, RouteTransitionPhase };

const READY_POLL_MS = 16;
const READY_TIMEOUT_MS = 15_000;

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

  const waitForScreenReady = useCallback(async (): Promise<void> => {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    let lastPathname = pathnameRef.current;

    while (Date.now() < deadline) {
      const currentPathname = pathnameRef.current;

      if (currentPathname !== lastPathname) {
        lastPathname = currentPathname;
        screenReadyRef.current = false;
      }

      if (screenReadyRef.current) {
        return;
      }

      await delay(READY_POLL_MS);
    }
  }, []);

  const beginTransition = useCallback(
    async (to: To, options?: BeginTransitionOptions) => {
      const targetPath = resolveNavigatePath(to);
      const destinationKey = resolveNavigateDestinationKey(to);
      const navigateOptions = {
        replace: options?.replace,
        state: options?.state,
        preventScrollReset: options?.preventScrollReset,
        relative: options?.relative,
        viewTransition: false as const,
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
        return;
      }

      loadingTargetRef.current = destinationKey;
      screenReadyRef.current = false;
      phaseRef.current = "loading";
      setPhase("loading");

      try {
        try {
          await preloadRoute(targetPath);
        } catch {
          // Warm-up only; the rendered lazy route retries chunk failures itself.
        }

        navigate(to, navigateOptions);

        await waitForScreenReady();

        if (transitionGenerationRef.current !== myGeneration) {
          return;
        }

        phaseRef.current = "revealing";
        setPhase("revealing");
        try {
          await revealRouteTransition(revealDirectionRef.current, animate);
        } catch {
          // Navigation succeeded; a failed reveal should not block the route.
        }
      } finally {
        if (transitionGenerationRef.current === myGeneration) {
          loadingTargetRef.current = null;
          phaseRef.current = "idle";
          setPhase("idle");
        }
      }
    },
    [animate, navigate, waitForScreenReady],
  );

  const value = useMemo(
    () => ({
      phase,
      beginTransition,
      reportScreenReady,
    }),
    [phase, beginTransition, reportScreenReady],
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}
