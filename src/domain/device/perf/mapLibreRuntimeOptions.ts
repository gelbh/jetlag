export type MapLibreRuntimeOptions = {
  fadeDuration?: number;
  maxTileCacheSize?: number;
};

/**
 * MapLibre constructor knobs for play-day runtime.
 * Normal mode omits overrides so MapLibre keeps dynamic tile cache + default fade.
 * Low-power cuts label fade work and caps tile retention.
 */
export function mapLibreRuntimeOptions(
  lowPowerMode: boolean,
): MapLibreRuntimeOptions {
  if (!lowPowerMode) {
    return {};
  }

  return {
    fadeDuration: 0,
    maxTileCacheSize: 50,
  };
}
