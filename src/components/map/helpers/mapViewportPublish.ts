export const VIEWPORT_PUBLISH_THROTTLE_MS = 200;

/** Mid-gesture viewport policy keyed by Leaflet event phase. */
export const VIEWPORT_PUBLISH_BY_PHASE = {
  move: "schedule",
  zoom: "schedule",
  moveend: "schedule",
  dragend: "flush",
  zoomend: "flush",
} as const;

export type ViewportPublishPhase = keyof typeof VIEWPORT_PUBLISH_BY_PHASE;

export function createThrottledPublisher(
  publish: () => void,
  throttleMs: number = VIEWPORT_PUBLISH_THROTTLE_MS,
): {
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule() {
      if (timer != null) {
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        publish();
      }, throttleMs);
    },
    flush() {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      publish();
    },
    cancel() {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
