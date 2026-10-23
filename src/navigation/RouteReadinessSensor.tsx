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
 * public shells and /join so this global sync does not mint an anonymous user
 * or hit the App Check callable (reCAPTCHA) on those routes. `/premium` is a
 * public shell but still mounts `PremiumReadiness` / page entitlements itself;
 * only this background sync is skipped there.
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
