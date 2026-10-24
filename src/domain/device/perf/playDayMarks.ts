export const PWA_MARK_NAV = "pwa:nav";
export const PWA_MARK_APP_READY = "pwa:app-ready";
export const PWA_MARK_MAP_USABLE = "pwa:map-usable";
export const PWA_MARK_MAP_RESUME = "pwa:map-resume";
export const PWA_MEASURE_MAP_RETURN = "pwa:map-return";

export function markPlayDay(name: string): void {
  if (typeof performance === "undefined") {
    return;
  }

  try {
    performance.mark(name);
  } catch {}
}

export function measurePlayDay(name: string, start: string, end: string): number | null {
  if (typeof performance === "undefined") {
    return null;
  }

  try {
    performance.measure(name, start, end);
    const entries = performance.getEntriesByName(name, "measure");
    const last = entries.at(-1);
    return last?.duration ?? null;
  } catch {
    return null;
  }
}

export function markMapResumeStart(): void {
  markPlayDay(PWA_MARK_MAP_RESUME);
}

export function markMapUsableAndMeasureReturn(): number | null {
  markPlayDay(PWA_MARK_MAP_USABLE);
  return measurePlayDay(PWA_MEASURE_MAP_RETURN, PWA_MARK_MAP_RESUME, PWA_MARK_MAP_USABLE);
}
