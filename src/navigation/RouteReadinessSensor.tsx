import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { isPublicShellPath } from "@/domain/device/perf/publicShellPaths";
import { usePremiumEntitlements } from "../hooks/billing/usePremiumEntitlements";
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
 * public shells: refresh mints an anonymous user and starts Firebase Auth.
 */
function PremiumEntitlementsSync() {
  usePremiumEntitlements();
  return null;
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
      {isPublicShellPath(pathname) ? null : <PremiumEntitlementsSync />}
    </>
  );
}
