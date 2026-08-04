import type { To } from "react-router-dom";
import { lazyWithChunkRetry } from "../domain/device/updates/lazyWithChunkRetry";
import { lazyRouteLoaderKey, normalizeRoutePath } from "./routeMetadata";
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

export const importGamePresetList = () =>
  import("../routes/GamePresets").then((m) => ({ default: m.GamePresetList }));

export const importGamePresetEditor = () =>
  import("../routes/GamePresets").then((m) => ({ default: m.GamePresetEditor }));

export const importStats = () =>
  import("../routes/Stats").then((m) => ({ default: m.Stats }));

export const importFriends = () =>
  import("../routes/Friends").then((m) => ({ default: m.Friends }));

export const importLeaderboard = () =>
  import("../routes/Leaderboard").then((m) => ({ default: m.Leaderboard }));

export const importAdminOpsDesk = () =>
  import("../components/admin/AdminOpsDesk").then((m) => ({
    default: m.AdminOpsDesk,
  }));

export const importFeedback = () =>
  import("../routes/Feedback").then((m) => ({ default: m.Feedback }));

export const importJoinSession = () =>
  import("../routes/JoinSession").then((m) => ({ default: m.JoinSession }));

export const importPrivacy = () =>
  import("../routes/Privacy").then((m) => ({ default: m.Privacy }));

export const importPremium = () =>
  import("../routes/Premium").then((m) => ({ default: m.Premium }));

export const importTerms = () =>
  import("../routes/Terms").then((m) => ({ default: m.Terms }));

export const importNotFound = () =>
  import("../routes/NotFound").then((m) => ({ default: m.NotFound }));

export const importAppResumeWatchdog = () =>
  import("../components/ui/AppResumeWatchdog").then((m) => ({
    default: m.AppResumeWatchdog,
  }));

export const routeImporter = {
  importMapScreen,
  importCreateSession,
  importGamePresetList,
  importGamePresetEditor,
  importStats,
  importFriends,
  importLeaderboard,
  importAdminOpsDesk,
  importFeedback,
  importJoinSession,
  importPrivacy,
  importPremium,
  importTerms,
  importNotFound,
};

export const MapScreenLazy = lazyWithChunkRetry(importMapScreen);
export const CreateSessionLazy = lazyWithChunkRetry(importCreateSession);
export const GamePresetListLazy = lazyWithChunkRetry(importGamePresetList);
export const GamePresetEditorLazy = lazyWithChunkRetry(importGamePresetEditor);
export const StatsLazy = lazyWithChunkRetry(importStats);
export const FriendsLazy = lazyWithChunkRetry(importFriends);
export const LeaderboardLazy = lazyWithChunkRetry(importLeaderboard);
export const AdminOpsDeskLazy = lazyWithChunkRetry(importAdminOpsDesk);
export const FeedbackLazy = lazyWithChunkRetry(importFeedback);
export const JoinSessionLazy = lazyWithChunkRetry(importJoinSession);
export const PrivacyLazy = lazyWithChunkRetry(importPrivacy);
export const PremiumLazy = lazyWithChunkRetry(importPremium);
export const TermsLazy = lazyWithChunkRetry(importTerms);
export const NotFoundLazy = lazyWithChunkRetry(importNotFound);
export const AppResumeWatchdogLazy = lazyWithChunkRetry(importAppResumeWatchdog);

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
      queryIndex === -1
        ? ""
        : to.slice(queryIndex, hashIndex === -1 ? undefined : hashIndex);
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
    const warmers: Array<Promise<unknown>> = [routeImporter[loaderKey]()];
    if (loaderKey === "importMapScreen") {
      // Return-to-map: avoid serial wait on MapViewMapLibre after MapScreen.
      warmers.push(mapShellWarmers.importMapViewMapLibre());
    }
    await Promise.all(warmers);
    markRouteImportWarm(normalizedPath);
  }
}
