import type { To } from "react-router-dom";
import {
  type LazyRouteComponent,
  lazyWithChunkRetry,
} from "../domain/device/updates/lazyWithChunkRetry";
import { type LazyRouteLoaderKey, lazyRouteLoaderKey, normalizeRoutePath } from "./routeMetadata";
import { markRouteImportWarm } from "./routeWarmState";

export const importMapScreen = () =>
  import("../routes/MapScreen").then((m) => ({ default: m.MapScreen }));

/** Warm MapLibre shell chunk ahead of MapView's React.lazy boundary. */
export const mapShellWarmers = {
  importMapViewMapLibre: () =>
    import("../components/map/chrome/MapViewMapLibre").then((m) => ({
      default: m.MapViewMapLibre,
    })),
};

export const importCreateSession = () =>
  import("../routes/CreateSession").then((m) => ({ default: m.CreateSession }));

export const importJoinSession = () =>
  import("../routes/JoinSession").then((m) => ({ default: m.JoinSession }));

export const importGamePresetList = () =>
  import("../routes/GamePresets").then((m) => ({ default: m.GamePresetList }));

export const importGamePresetEditor = () =>
  import("../routes/GamePresets").then((m) => ({ default: m.GamePresetEditor }));

export const importStats = () => import("../routes/Stats").then((m) => ({ default: m.Stats }));

export const importFriends = () =>
  import("../routes/Friends").then((m) => ({ default: m.Friends }));

export const importLeaderboard = () =>
  import("../routes/Leaderboard").then((m) => ({ default: m.Leaderboard }));

export const importAdminOpsDesk = () =>
  import("../components/admin/ops/AdminOpsDesk").then((m) => ({
    default: m.AdminOpsDesk,
  }));

export const importAdminPreloadRequestInbox = () =>
  import("../components/admin/ops/AdminPreloadRequestInbox").then((m) => ({
    default: m.AdminPreloadRequestInbox,
  }));

export const importFeedback = () =>
  import("../routes/Feedback").then((m) => ({ default: m.Feedback }));

export const importPrivacy = () =>
  import("../routes/Privacy").then((m) => ({ default: m.Privacy }));

export const importPremium = () =>
  import("../routes/Premium").then((m) => ({ default: m.Premium }));

export const importTerms = () => import("../routes/Terms").then((m) => ({ default: m.Terms }));

export const importNotFound = () =>
  import("../routes/NotFound").then((m) => ({ default: m.NotFound }));

export const importAppResumeWatchdog = () =>
  import("../components/ui/AppResumeWatchdog").then((m) => ({
    default: m.AppResumeWatchdog,
  }));

export const routeImporter = {
  importMapScreen,
  importCreateSession,
  importJoinSession,
  importGamePresetList,
  importGamePresetEditor,
  importStats,
  importFriends,
  importLeaderboard,
  importAdminOpsDesk,
  importAdminPreloadRequestInbox,
  importFeedback,
  importPrivacy,
  importPremium,
  importTerms,
  importNotFound,
};

export const MapScreenLazy = lazyWithChunkRetry(importMapScreen);
export const CreateSessionLazy = lazyWithChunkRetry(importCreateSession);
export const JoinSessionLazy = lazyWithChunkRetry(importJoinSession);
export const GamePresetListLazy = lazyWithChunkRetry(importGamePresetList);
export const GamePresetEditorLazy = lazyWithChunkRetry(importGamePresetEditor);
export const StatsLazy = lazyWithChunkRetry(importStats);
export const FriendsLazy = lazyWithChunkRetry(importFriends);
export const LeaderboardLazy = lazyWithChunkRetry(importLeaderboard);
export const AdminOpsDeskLazy = lazyWithChunkRetry(importAdminOpsDesk);
export const AdminPreloadRequestInboxLazy = lazyWithChunkRetry(importAdminPreloadRequestInbox);
export const FeedbackLazy = lazyWithChunkRetry(importFeedback);
export const PrivacyLazy = lazyWithChunkRetry(importPrivacy);
export const PremiumLazy = lazyWithChunkRetry(importPremium);
export const TermsLazy = lazyWithChunkRetry(importTerms);
export const NotFoundLazy = lazyWithChunkRetry(importNotFound);
export const AppResumeWatchdogLazy = lazyWithChunkRetry(importAppResumeWatchdog);

// Hover/intent warmers (`preloadRoute`) keep using `routeImporter`; only hydration needs the
// lazy component itself resolved.
const lazyRouteByLoaderKey: Record<LazyRouteLoaderKey, LazyRouteComponent> = {
  importMapScreen: MapScreenLazy,
  importCreateSession: CreateSessionLazy,
  importJoinSession: JoinSessionLazy,
  importGamePresetList: GamePresetListLazy,
  importGamePresetEditor: GamePresetEditorLazy,
  importAdminOpsDesk: AdminOpsDeskLazy,
  importFeedback: FeedbackLazy,
  importPrivacy: PrivacyLazy,
  importPremium: PremiumLazy,
  importTerms: TermsLazy,
  importStats: StatsLazy,
  importFriends: FriendsLazy,
  importLeaderboard: LeaderboardLazy,
};

/**
 * Resolve the route's `React.lazy` component (not just its chunk) so a prerendered shell
 * hydrates the route in the first pass instead of leaving it dehydrated.
 */
export async function preloadLazyRouteComponent(path: string): Promise<void> {
  // Assets also serve `/join/` from dist/join/index.html.
  const loaderKey = lazyRouteLoaderKey(path.length > 1 ? path.replace(/\/$/, "") : path);
  if (loaderKey) {
    await lazyRouteByLoaderKey[loaderKey].preload();
  }
}

export { isLazyRoute, normalizeRoutePath } from "./routeMetadata";

export function resolveNavigatePath(to: To): string {
  if (typeof to === "string") {
    return normalizeRoutePath(to);
  }

  return normalizeRoutePath(to.pathname ?? "/");
}

export function resolveNavigateDestinationKey(to: To): string {
  if (typeof to === "string") {
    const hashIndex = to.indexOf("#");
    const queryIndex = to.indexOf("?");
    const pathEnd = Math.min(
      hashIndex === -1 ? to.length : hashIndex,
      queryIndex === -1 ? to.length : queryIndex,
    );
    const pathPart = to.slice(0, pathEnd) || "/";
    const queryPart =
      queryIndex === -1 ? "" : to.slice(queryIndex, hashIndex === -1 ? undefined : hashIndex);
    const hashPart = hashIndex === -1 ? "" : to.slice(hashIndex);

    return `${normalizeRoutePath(pathPart)}${queryPart}${hashPart}`;
  }

  const pathname = normalizeRoutePath(to.pathname ?? "/");
  const search = to.search ?? "";
  const hash = to.hash ?? "";

  return `${pathname}${search}${hash}`;
}

export async function preloadRoute(path: string): Promise<void> {
  const normalizedPath = normalizeRoutePath(path);
  const loaderKey = lazyRouteLoaderKey(path);
  if (loaderKey) {
    const routeLoad = routeImporter[loaderKey]();
    if (loaderKey === "importMapScreen") {
      // Best-effort shell warm; must not block MapScreen warm marking.
      void mapShellWarmers.importMapViewMapLibre().catch(() => undefined);
    }
    await routeLoad;
    markRouteImportWarm(normalizedPath);
  }
}
