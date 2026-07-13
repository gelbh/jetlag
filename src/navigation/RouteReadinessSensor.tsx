import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRouteTransition } from "./useRouteTransition";
import { useRouteScreenReady } from "./useRouteScreenReady";

export function RouteReadinessSensor() {
  const { pathname } = useLocation();
  const screenReady = useRouteScreenReady(pathname);
  const { reportScreenReady } = useRouteTransition();

  useLayoutEffect(() => {
    reportScreenReady(screenReady);
  }, [screenReady, reportScreenReady]);

  return null;
}
