import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks whether `ref.current` intersects the viewport.
 * Pass `observeKey` (e.g. viewer uid) so the observer rebinds after async mount.
 */
export function useRowInView(
  ref: RefObject<Element | null>,
  observeKey?: string | null,
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry?.isIntersecting ?? false);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [ref, observeKey]);

  return inView;
}
