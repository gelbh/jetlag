export type MapTilt = "flat" | "tilted";

export const MAP_TILT_OPTIONS: ReadonlyArray<{
  value: MapTilt;
  label: string;
}> = [
  { value: "flat", label: "Flat" },
  { value: "tilted", label: "Tilted" },
];

/** CSS perspective distance (px) on the map shell when tilt is active. */
export const MAP_TILT_PERSPECTIVE_PX = 1400;

/** Pitch around the horizontal axis (deg). Keep small for click accuracy. */
export const MAP_TILT_ROTATE_X_DEG = 12;

/** Subtle roll for visual depth (deg). */
export const MAP_TILT_ROTATE_Z_DEG = -1.5;

/** Leaflet TileLayer keepBuffer when tilt reveals receding edges. Default is 2. */
export const MAP_TILT_TILE_KEEP_BUFFER = 5;

/** Extra top fitBounds padding (px) when tilt crops the northern edge. */
export const MAP_TILT_FIT_BOUNDS_TOP_BIAS_PX = 40;

export function isMapTiltActive(tilt: MapTilt): boolean {
  return tilt === "tilted";
}

export function mapTiltCssVariables(): Record<`--${string}`, string> {
  return {
    "--map-tilt-perspective": `${MAP_TILT_PERSPECTIVE_PX}px`,
    "--map-tilt-rotate-x": `${MAP_TILT_ROTATE_X_DEG}deg`,
    "--map-tilt-rotate-z": `${MAP_TILT_ROTATE_Z_DEG}deg`,
  };
}

export function mapTiltFitBoundsPadding(
  basePadding: [number, number],
  tilt: MapTilt,
): [number, number] {
  if (!isMapTiltActive(tilt)) {
    return basePadding;
  }

  const [padY, padX] = basePadding;
  return [padY + MAP_TILT_FIT_BOUNDS_TOP_BIAS_PX, padX];
}
