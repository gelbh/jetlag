import { useCallback } from "react";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";
import { useMotionProfile } from "./useMotionProfile";

const RESET_PATHS = new Set(["/", "/map"]);

let navigationStack: string[] = [
  typeof window !== "undefined" ? window.location.pathname : "/",
];

function resolvePath(to: To): string {
  if (typeof to === "string") {
    return to.split("?")[0]?.split("#")[0] ?? "";
  }

  return to.pathname ?? "";
}

/** @internal Test-only reset for navigation stack. */
export function resetAppNavigationStackForTests(path = "/"): void {
  navigationStack = [path];
}

export function useAppNavigate() {
  const navigate = useNavigate();
  const { animate } = useMotionProfile();

  return useCallback(
    (
      to: To,
      options?: NavigateOptions & {
        direction?: "forward" | "back" | "replace";
      },
    ) => {
      const path = resolvePath(to);
      const direction =
        options?.direction ?? (options?.replace ? "replace" : "forward");

      if (RESET_PATHS.has(path)) {
        navigationStack = [path];
      } else if (direction === "back") {
        navigationStack.pop();
      } else if (direction !== "replace") {
        navigationStack.push(path);
      }

      const navDir =
        direction === "back" ? "back" : direction === "replace" ? "neutral" : "forward";
      document.documentElement.dataset.navDirection = navDir;

      navigate(to, {
        replace: options?.replace,
        state: options?.state,
        preventScrollReset: options?.preventScrollReset,
        relative: options?.relative,
        viewTransition: animate,
      });
    },
    [navigate, animate],
  );
}

export function useAppNavigationStack() {
  const navigate = useNavigate();
  const { animate } = useMotionProfile();

  const canGoBack = useCallback(() => navigationStack.length > 1, []);

  const goBack = useCallback(() => {
    if (navigationStack.length <= 1) {
      return;
    }

    navigationStack.pop();
    const destination = navigationStack[navigationStack.length - 1] ?? "/";
    document.documentElement.dataset.navDirection = "back";
    navigate(destination, { viewTransition: animate });
  }, [navigate, animate]);

  return { canGoBack, goBack };
}
