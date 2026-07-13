import { createContext } from "react";
import type { NavigateOptions, To } from "react-router-dom";
import type { RouteLoadingProgress } from "./routeLoadingSteps";

export type RouteTransitionPhase = "idle" | "loading" | "revealing";

export type RouteLoadingReason = "page" | "map" | "sign-in" | "premium" | "admin";

export type BeginTransitionOptions = NavigateOptions & {
  direction?: "forward" | "back" | "replace";
};

export interface RouteTransitionContextValue {
  phase: RouteTransitionPhase;
  loadingReason: RouteLoadingReason | null;
  loadingProgress: RouteLoadingProgress | null;
  beginTransition: (to: To, options?: BeginTransitionOptions) => Promise<void>;
  reportScreenReady: (ready: boolean) => void;
}

export const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);
