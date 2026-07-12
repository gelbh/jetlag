import { useCallback, useMemo, useRef } from "react";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";
import { useMotionProfile } from "./useMotionProfile";

const RESET_PATHS = new Set(["/", "/map"]);

function resolvePath(to: To): string {
  if (typeof to === "string") {
    return to.split("?")[0]?.split("#")[0] ?? "";
  }

  return to.pathname ?? "";
}

export function useAppNavigate() {
  const navigate = useNavigate();
  const { animate } = useMotionProfile();
  const stackRef = useRef<string[]>([
    typeof window !== "undefined" ? window.location.pathname : "/",
  ]);

  const go = useCallback(
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
        stackRef.current = [path];
      } else if (direction === "back") {
        stackRef.current.pop();
      } else if (direction !== "replace") {
        stackRef.current.push(path);
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

  return useMemo(
    () =>
      Object.assign(go, {
        canGoBack: () => stackRef.current.length > 1,
        goBack: () => {
          if (stackRef.current.length <= 1) {
            return;
          }

          stackRef.current.pop();
          const destination = stackRef.current[stackRef.current.length - 1] ?? "/";
          document.documentElement.dataset.navDirection = "back";
          navigate(destination, { viewTransition: animate });
        },
      }),
    [go, navigate, animate],
  );
}
