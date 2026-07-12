import { useEffect, useState, type RefObject } from "react";
import { useMinWidth } from "../useMinWidth";

const VIEWPORT_WIDE_PX = 768;
const CONTAINER_WIDE_PX = 640;

function useContainerMinWidth(
  ref: RefObject<HTMLElement | null>,
  minWidthPx: number,
  ready = true,
): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!ready) {
      setMatches(false);
      return;
    }

    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const width =
        entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      setMatches(width >= minWidthPx);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [minWidthPx, ready, ref]);

  return matches;
}

export function useAdminMapWideLayout(
  shellRef: RefObject<HTMLElement | null>,
  options?: { embedded?: boolean; ready?: boolean },
): boolean {
  const viewportWide = useMinWidth(VIEWPORT_WIDE_PX);
  const containerWide = useContainerMinWidth(
    shellRef,
    CONTAINER_WIDE_PX,
    options?.ready ?? true,
  );

  if (options?.embedded) {
    return containerWide;
  }

  return viewportWide || containerWide;
}
