import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { usePremiumEntitlements } from "../hooks/billing/usePremiumEntitlements";
import { usePlayAreaReady } from "../hooks/session/usePlayAreaReady";
import { useSessionStore } from "../state/sessionStore";

export type RouteReadinessKind = "play-area" | "admin-auth" | "premium" | "layout";

export function routeReadinessKind(pathname: string): RouteReadinessKind {
  switch (pathname) {
    case "/map":
      return "play-area";
    case "/admin":
      return "admin-auth";
    case "/premium":
      return "premium";
    default:
      return "layout";
  }
}

// One hook per readiness kind: RouteReadinessSensor mounts only the current
// kind's hook, so auth/entitlement hooks (which start Firebase Auth) do not
// run on public shells like `/`.

export function usePlayAreaScreenReady(): boolean {
  const session = useSessionStore((state) => state.session);
  return usePlayAreaReady(session);
}

export function useAdminAuthScreenReady(): boolean {
  return usePermanentAuthUser().authReady;
}

export function usePremiumScreenReady(): boolean {
  return !usePremiumEntitlements().loading;
}
