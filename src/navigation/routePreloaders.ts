import type { To } from "react-router-dom";
import { lazyWithChunkRetry } from "../domain/device/lazyWithChunkRetry";
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

export const routeImporter = {
  importMapScreen,
  importCreateSession,
  importGamePresetList,
  importGamePresetEditor,
  importTutorial,
};

export const MapScreenLazy = lazyWithChunkRetry(importMapScreen);
export const CreateSessionLazy = lazyWithChunkRetry(importCreateSession);
export const GamePresetListLazy = lazyWithChunkRetry(importGamePresetList);
export const GamePresetEditorLazy = lazyWithChunkRetry(importGamePresetEditor);
export const TutorialLazy = lazyWithChunkRetry(importTutorial);

const PRESET_EDIT_PATH_RE = /^\/presets\/[^/]+\/edit$/;

const LAZY_ROUTE_LOADERS: Record<
  string,
  keyof typeof routeImporter
> = {
  "/map": "importMapScreen",
  "/create": "importCreateSession",
  "/tutorial": "importTutorial",
  "/presets": "importGamePresetList",
  "/presets/new": "importGamePresetEditor",
  "/presets/:id/edit": "importGamePresetEditor",
};

export function normalizeRoutePath(path: string): string {
  const base = path.split("?")[0]?.split("#")[0] ?? "/";

  if (PRESET_EDIT_PATH_RE.test(base)) {
    return "/presets/:id/edit";
  }

  return base || "/";
}

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

export function isLazyRoute(path: string): boolean {
  return normalizeRoutePath(path) in LAZY_ROUTE_LOADERS;
}

export async function preloadRoute(path: string): Promise<void> {
  const normalizedPath = normalizeRoutePath(path);
  const loaderKey = LAZY_ROUTE_LOADERS[normalizedPath];
  if (loaderKey) {
    await routeImporter[loaderKey]();
    markRouteImportWarm(normalizedPath);
  }
}
