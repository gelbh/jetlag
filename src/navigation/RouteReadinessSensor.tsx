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

/**
 * Keeps the entitlements store hydrated for readers that do not mount
 * `usePremiumEntitlements` themselves (e.g. SupportAgentChat). Skipped on
 * public shells and /join (no premium readers): refresh mints an anonymous
 * user and calls an App Check-enforced callable, which loads reCAPTCHA.
 */
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
