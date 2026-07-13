import { usePremiumEntitlements } from "../hooks/billing/usePremiumEntitlements";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { useAuthBootstrapReady } from "../hooks/useAuthBootstrapReady";
import { useResolvedSessionRules } from "../hooks/session/useResolvedSessionRules";
import { useSessionStore } from "../state/sessionStore";

export type RouteReadinessKind =
  | "auth-bootstrap"
  | "play-area"
  | "admin-auth"
  | "premium"
  | "layout";

export function routeReadinessKind(pathname: string): RouteReadinessKind {
  switch (pathname) {
    case "/":
      return "auth-bootstrap";
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

export function useRouteScreenReady(pathname: string): boolean {
  const authBootstrapReady = useAuthBootstrapReady();
  const session = useSessionStore((state) => state.session);
  const { playAreaReady } = useResolvedSessionRules(session);
  const { authReady } = usePermanentAuthUser();
  const { loading: premiumLoading } = usePremiumEntitlements();

  switch (routeReadinessKind(pathname)) {
    case "auth-bootstrap":
      return authBootstrapReady;
    case "play-area":
      return playAreaReady;
    case "admin-auth":
      return authReady;
    case "premium":
      return !premiumLoading;
    case "layout":
      return true;
  }
}
