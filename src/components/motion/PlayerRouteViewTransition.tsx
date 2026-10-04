import { type ReactNode, ViewTransition } from "react";
import { useMotionProfile } from "../../hooks/motion/useMotionProfile";

/** View-transition class applied to player route cross-fades (see motion.css). */
export const PLAYER_ROUTE_VIEW_TRANSITION_CLASS = "jl-route-reveal";

const DECORATIVE_OFF_PROPS = {
  default: "none",
  enter: "none",
  exit: "none",
  update: "none",
  share: "none",
} as const;

const DECORATIVE_ON_PROPS = {
  default: "none",
  enter: PLAYER_ROUTE_VIEW_TRANSITION_CLASS,
  exit: PLAYER_ROUTE_VIEW_TRANSITION_CLASS,
  update: PLAYER_ROUTE_VIEW_TRANSITION_CLASS,
  share: "auto",
} as const;

/** Persistent React VT boundary for player `<Outlet />`; gated by decorative motion. */
export function PlayerRouteViewTransition({ children }: { children: ReactNode }) {
  const { decorativeAnimate } = useMotionProfile();
  const vtProps = decorativeAnimate ? DECORATIVE_ON_PROPS : DECORATIVE_OFF_PROPS;

  return <ViewTransition {...vtProps}>{children}</ViewTransition>;
}
