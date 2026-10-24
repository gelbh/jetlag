import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { isPublicShellPath } from "@/domain/device/perf/publicShellPaths";
import { usePremiumEntitlements } from "../hooks/billing/usePremiumEntitlements";
import { parameterizedRoutePath } from "./routeMetadata";
import {
  routeReadinessKind,
  useAdminAuthScreenReady,
  usePlayAreaScreenReady,
  usePremiumScreenReady,
} from "./useRouteScreenReady";
import { useRouteTransition } from "./useRouteTransition";

function ScreenReadyReporter({ ready }: { ready: boolean }) {
  const { reportScreenReady } = useRouteTransition();

  useLayoutEffect(() => {
    reportScreenReady(ready);
  }, [ready, reportScreenReady]);

  return null;
}

function PlayAreaReadiness() {
  return <ScreenReadyReporter ready={usePlayAreaScreenReady()} />;
}

function AdminAuthReadiness() {
  return <ScreenReadyReporter ready={useAdminAuthScreenReady()} />;
}

function PremiumReadiness() {
  return <ScreenReadyReporter ready={usePremiumScreenReady()} />;
}

function PremiumEntitlementsSync() {
  usePremiumEntitlements();
  return null;
}

function syncsEntitlements(pathname: string): boolean {
  return !isPublicShellPath(pathname) && parameterizedRoutePath(pathname) !== "/join";
}

export function RouteReadinessSensor() {
  const { pathname } = useLocation();
  const kind = routeReadinessKind(pathname);

  return (
    <>
      {kind === "play-area" ? <PlayAreaReadiness /> : null}
      {kind === "admin-auth" ? <AdminAuthReadiness /> : null}
      {kind === "premium" ? <PremiumReadiness /> : null}
      {kind === "layout" ? <ScreenReadyReporter ready /> : null}
      {syncsEntitlements(pathname) ? <PremiumEntitlementsSync /> : null}
    </>
  );
}
