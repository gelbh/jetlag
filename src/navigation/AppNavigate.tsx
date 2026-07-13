import { useEffect, useRef } from "react";
import { useNavigate, type NavigateProps } from "react-router-dom";
import { useRouteTransition } from "./useRouteTransition";

export function AppNavigate({ to, replace, state }: NavigateProps) {
  const { phase, beginTransition } = useRouteTransition();
  const navigate = useNavigate();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) {
      return;
    }
    ranRef.current = true;

    if (phase === "idle") {
      void beginTransition(to, {
        replace,
        state,
        direction: replace ? "replace" : "forward",
      });
      return;
    }

    navigate(to, { replace, state, viewTransition: false });
    // Redirect once on mount; during an active gate, follow the chain in-place.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only redirect
  }, []);

  return null;
}
