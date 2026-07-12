const BENCHMARK_FRAMES = 10;
const BENCHMARK_TIMEOUT_MS = 120;

export function runTransformBenchmark(): Promise<number> {
  if (typeof document === "undefined" || typeof requestAnimationFrame !== "function") {
    return Promise.resolve(0);
  }

  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;left:-9999px;width:1px;height:1px;transform:translateX(0)";
    document.body.appendChild(el);

    const start = performance.now();
    let frames = 0;

    const timeoutId = window.setTimeout(() => {
      document.body.removeChild(el);
      resolve(0);
    }, BENCHMARK_TIMEOUT_MS);

    const tick = (now: number) => {
      frames += 1;
      el.style.transform = `translateX(${frames}px)`;
      if (frames >= BENCHMARK_FRAMES) {
        window.clearTimeout(timeoutId);
        document.body.removeChild(el);
        const elapsed = now - start;
        const fps = Math.round((frames * 1000) / Math.max(elapsed, 1));
        resolve(fps);
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}
