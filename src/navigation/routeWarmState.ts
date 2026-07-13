import { isAuthBootstrapReady, isFirebaseConfigured } from "../services/core/firebase";
import { isPlayAreaReadySync } from "../services/geo/resolveSessionMatchingAreas";
import { usePremiumEntitlementsStore } from "../state/premiumEntitlementsStore";
import { useSessionStore } from "../state/sessionStore";
import { isLazyRoute } from "./routePreloaders";
import { routeReadinessKind } from "./useRouteScreenReady";

const warmImports = new Set<string>();

export function markRouteImportWarm(normalizedPath: string): void {
  warmImports.add(normalizedPath);
}

export function isRouteImportWarm(normalizedPath: string): boolean {
  return warmImports.has(normalizedPath);
}

export function clearRouteWarmStateForTests(): void {
  warmImports.clear();
}

export function getSyncRouteReady(pathname: string): boolean {
  switch (routeReadinessKind(pathname)) {
    case "auth-bootstrap":
      return !isFirebaseConfigured() || isAuthBootstrapReady();
    case "play-area":
      return isPlayAreaReadySync(useSessionStore.getState().session);
    case "admin-auth":
      return !isFirebaseConfigured() || isAuthBootstrapReady();
    case "premium":
      return usePremiumEntitlementsStore.getState().hydrated;
    case "layout":
      return true;
  }
}

export function isWarmFastPathEligible(pathname: string): boolean {
  return (
    (!isLazyRoute(pathname) || isRouteImportWarm(pathname)) &&
    getSyncRouteReady(pathname)
  );
}
