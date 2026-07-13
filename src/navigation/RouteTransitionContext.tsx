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
import { preloadRoute, resolveNavigatePath } from "./routePreloaders";
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
      const navigateOptions = {
        replace: options?.replace,
        state: options?.state,
        preventScrollReset: options?.preventScrollReset,
        relative: options?.relative,
        viewTransition: false as const,
      };

      if (
        phaseRef.current !== "idle" &&
        loadingTargetRef.current === targetPath
      ) {
        return;
      }

      if (phaseRef.current !== "idle") {
        try {
          await preloadRoute(targetPath);
        } catch {
          // Warm-up only; the rendered lazy route retries chunk failures itself.
        }

        navigate(to, navigateOptions);
        return;
      }

      loadingTargetRef.current = targetPath;
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

        phaseRef.current = "revealing";
        setPhase("revealing");
        try {
          await revealRouteTransition(
            toRevealDirection(options?.direction),
            animate,
          );
        } catch {
          // Navigation succeeded; a failed reveal should not block the route.
        }
      } finally {
        loadingTargetRef.current = null;
        phaseRef.current = "idle";
        setPhase("idle");
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
