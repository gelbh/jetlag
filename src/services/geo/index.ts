/**
 * Geo services package barrel.
 *
 * Prefer deep imports from package folders:
 *   ./overpass, ./elevation, ./geocoding, ./matching, ./cache, ./shared
 */

export type { GeoCacheLayer } from "./shared/cacheInterface";
export { memoryGeoCache } from "./cache/memory";
export * as cache from "./cache";
export * as elevation from "./elevation/index";
export * as geocoding from "./geocoding/index";
export * as matching from "./matching";
export * as overpass from "./overpass";
