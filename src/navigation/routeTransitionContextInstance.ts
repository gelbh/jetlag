import { createContext } from "react";
import type { NavigateOptions, To } from "react-router-dom";

export type RouteTransitionPhase = "idle" | "loading" | "revealing";

export type BeginTransitionOptions = NavigateOptions & {
  direction?: "forward" | "back" | "replace";
};

export interface RouteTransitionContextValue {
  phase: RouteTransitionPhase;
  beginTransition: (to: To, options?: BeginTransitionOptions) => Promise<void>;
  reportScreenReady: (ready: boolean) => void;
}

export const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);
