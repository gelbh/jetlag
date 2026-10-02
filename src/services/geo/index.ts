/**
 * Geo services package barrel.
 *
 * Prefer deep imports from package folders:
 *   ./overpass, ./elevation, ./geocoding, ./matching, ./cache, ./shared
 */

export * as cache from "./cache";
export { memoryGeoCache } from "./cache/memory";
export * as elevation from "./elevation/index";
export * as geocoding from "./geocoding/index";
export * as matching from "./matching";
export * as overpass from "./overpass";
export type { GeoCacheLayer } from "./shared/cacheInterface";
