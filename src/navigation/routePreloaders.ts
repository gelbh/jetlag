import type { To } from "react-router-dom";
import { lazyWithChunkRetry } from "../domain/device/lazyWithChunkRetry";
import { lazyRouteLoaderKey, normalizeRoutePath } from "./routeMetadata";
import { markRouteImportWarm } from "./routeWarmState";

export const importMapScreen = () =>
  import("../routes/MapScreen").then((m) => ({ default: m.MapScreen }));

export const importCreateSession = () =>
  import("../routes/CreateSession").then((m) => ({ default: m.CreateSession }));

export const importGamePresetList = () =>
  import("../routes/GamePresets").then((m) => ({ default: m.GamePresetList }));

export const importGamePresetEditor = () =>
  import("../routes/GamePresets").then((m) => ({ default: m.GamePresetEditor }));

export const importTutorial = () =>
  import("../routes/Tutorial").then((m) => ({ default: m.Tutorial }));

export const importStats = () =>
  import("../routes/Stats").then((m) => ({ default: m.Stats }));

export const importFriends = () =>
  import("../routes/Friends").then((m) => ({ default: m.Friends }));

export const importLeaderboard = () =>
  import("../routes/Leaderboard").then((m) => ({ default: m.Leaderboard }));

export const routeImporter = {
  importMapScreen,
  importCreateSession,
  importGamePresetList,
  importGamePresetEditor,
  importTutorial,
  importStats,
  importFriends,
  importLeaderboard,
};

export const MapScreenLazy = lazyWithChunkRetry(importMapScreen);
export const CreateSessionLazy = lazyWithChunkRetry(importCreateSession);
export const GamePresetListLazy = lazyWithChunkRetry(importGamePresetList);
export const GamePresetEditorLazy = lazyWithChunkRetry(importGamePresetEditor);
export const TutorialLazy = lazyWithChunkRetry(importTutorial);
export const StatsLazy = lazyWithChunkRetry(importStats);
export const FriendsLazy = lazyWithChunkRetry(importFriends);
export const LeaderboardLazy = lazyWithChunkRetry(importLeaderboard);

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
    await routeImporter[loaderKey]();
    markRouteImportWarm(normalizedPath);
  }
}
