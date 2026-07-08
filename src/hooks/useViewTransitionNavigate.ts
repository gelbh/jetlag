import { useNavigate, type NavigateOptions, type To } from "react-router-dom";
import { useCallback } from "react";
import { useMotionProfile } from "./location/useMotionProfile";

export function useViewTransitionNavigate() {
  const navigate = useNavigate();
  const { animate } = useMotionProfile();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      navigate(to, { ...options, viewTransition: animate });
    },
    [navigate, animate],
  );
}
