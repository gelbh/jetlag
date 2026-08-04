export type MapLibreRuntimeOptions = {
  fadeDuration: number;
  maxTileCacheSize: number;
};

const NORMAL_MAP_RUNTIME: MapLibreRuntimeOptions = {
  fadeDuration: 300,
  maxTileCacheSize: 100,
};

const LOW_POWER_MAP_RUNTIME: MapLibreRuntimeOptions = {
  fadeDuration: 0,
  maxTileCacheSize: 50,
};

/** MapLibre constructor knobs tuned for play-day runtime / low-power. */
export function mapLibreRuntimeOptions(
  lowPowerMode: boolean,
): MapLibreRuntimeOptions {
  return lowPowerMode ? LOW_POWER_MAP_RUNTIME : NORMAL_MAP_RUNTIME;
}
