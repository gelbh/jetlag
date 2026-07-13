import { useCallback } from "react";
import { type NavigateOptions, type To } from "react-router-dom";
import type { BeginTransitionOptions } from "../navigation/routeTransitionContextInstance";
import { useRouteTransition } from "../navigation/useRouteTransition";
import { resolveNavigatePath } from "../navigation/routePreloaders";

const RESET_PATHS = new Set(["/", "/map"]);

let navigationStack: string[] = [
  typeof window !== "undefined" ? window.location.pathname : "/",
];

/** @internal Test-only reset for navigation stack. */
export function resetAppNavigationStackForTests(path = "/"): void {
  navigationStack = [path];
}

export function useAppNavigate() {
  const { beginTransition } = useRouteTransition();

  return useCallback(
    (
      to: To,
      options?: NavigateOptions & {
        direction?: BeginTransitionOptions["direction"];
      },
    ) => {
      const path = resolveNavigatePath(to);
      const direction =
        options?.direction ?? (options?.replace ? "replace" : "forward");

      if (RESET_PATHS.has(path)) {
        navigationStack = [path];
      } else if (direction === "back") {
        navigationStack.pop();
      } else if (direction !== "replace") {
        navigationStack.push(path);
      }

      void beginTransition(to, {
        replace: options?.replace,
        state: options?.state,
        preventScrollReset: options?.preventScrollReset,
        relative: options?.relative,
        direction,
      });
    },
    [beginTransition],
  );
}

export function useAppNavigationStack() {
  const { beginTransition } = useRouteTransition();

  const canGoBack = useCallback(() => navigationStack.length > 1, []);

  const goBack = useCallback(() => {
    if (navigationStack.length <= 1) {
      return;
    }

    navigationStack.pop();
    const destination = navigationStack[navigationStack.length - 1] ?? "/";

    void beginTransition(destination, { direction: "back" });
  }, [beginTransition]);

  return { canGoBack, goBack };
}
