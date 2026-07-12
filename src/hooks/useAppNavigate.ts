import { useCallback, useContext, useRef } from "react";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";
import { MotionCapabilityContext } from "../components/motion/motionCapabilityContext";
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
  const capability = useContext(MotionCapabilityContext);
  const { animate } = useMotionProfile();
  const allowsViewTransitions = capability?.allowsViewTransitions ?? animate;
  const stackRef = useRef<string[]>([
    typeof window !== "undefined" ? window.location.pathname : "/",
  ]);

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
        viewTransition: allowsViewTransitions,
      });
    },
    [navigate, allowsViewTransitions],
  );
}
