/** Prerendered, indexable how-to-play pages (guide, question tool explainers, FAQ). */
export const LEARN_ROUTE_PATHS = [
  "/guide",
  "/tools",
  "/tools/radar",
  "/tools/thermometer",
  "/tools/matching",
  "/tools/measuring",
  "/tools/tentacles",
  "/tools/photo",
  "/faq",
] as const;

export type LearnRoutePath = (typeof LEARN_ROUTE_PATHS)[number];

const LEARN_ROUTE_PATH_SET: ReadonlySet<string> = new Set(LEARN_ROUTE_PATHS);

/** Exact match (case-sensitive, no trailing slash): callers normalize first. */
export function isLearnRoutePath(pathname: string): pathname is LearnRoutePath {
  return LEARN_ROUTE_PATH_SET.has(pathname);
}
