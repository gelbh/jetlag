import { useContext } from "react";
import {
  RouteTransitionContext,
  type RouteTransitionContextValue,
} from "./routeTransitionContextInstance";

export function useRouteTransition(): RouteTransitionContextValue {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error("useRouteTransition must be used within RouteTransitionProvider");
  }
  return context;
}
