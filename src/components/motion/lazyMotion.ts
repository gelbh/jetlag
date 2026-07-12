type MotionModule = typeof import("motion/react");

let cached: MotionModule | null = null;
let loading: Promise<MotionModule> | null = null;

export function loadMotionModule(): Promise<MotionModule> {
  if (cached) return Promise.resolve(cached);
  if (!loading) {
    loading = import("motion/react").then((mod) => {
      cached = mod;
      return mod;
    });
  }
  return loading;
}

export function isMotionModuleLoaded(): boolean {
  return cached !== null;
}
