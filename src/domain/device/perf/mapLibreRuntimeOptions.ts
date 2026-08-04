export type MapLibreRuntimeOptions = {
  fadeDuration: number;
  maxTileCacheSize: number | null;
};

/** Default MapLibre fade; null tile cache = dynamic sizing. */
const NORMAL_MAP_RUNTIME: MapLibreRuntimeOptions = {
  fadeDuration: 300,
  maxTileCacheSize: null,
};

const LOW_POWER_MAP_RUNTIME: MapLibreRuntimeOptions = {
  fadeDuration: 0,
  maxTileCacheSize: 50,
};

/**
 * Explicit MapLibre constructor knobs so low-power toggles always apply
 * known values (constructor options are not live-updated by react-map-gl).
 */
export function mapLibreRuntimeOptions(
  lowPowerMode: boolean,
): MapLibreRuntimeOptions {
  return lowPowerMode ? LOW_POWER_MAP_RUNTIME : NORMAL_MAP_RUNTIME;
}
