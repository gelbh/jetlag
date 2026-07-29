import { useCallback, useState } from "react";
import { useLandscapeMapDominant } from "../layout/useLandscapeMapDominant";

export type MapLandscapeChromeMode = "portrait" | "collapsed" | "revealed";

export function useMapLandscapeChromeReveal(): {
  mode: MapLandscapeChromeMode;
  collapsed: boolean;
  active: boolean;
  toggle: () => void;
  collapse: () => void;
} {
  const landscapeActive = useLandscapeMapDominant();
  const [revealed, setRevealed] = useState(false);

  // Reset reveal when leaving landscape (adjust during render — avoids setState-in-effect).
  if (!landscapeActive && revealed) {
    setRevealed(false);
  }

  const toggle = useCallback(() => {
    setRevealed((open) => !open);
  }, []);

  const collapse = useCallback(() => {
    setRevealed(false);
  }, []);

  if (!landscapeActive) {
    return {
      mode: "portrait",
      collapsed: false,
      active: false,
      toggle,
      collapse,
    };
  }

  return {
    mode: revealed ? "revealed" : "collapsed",
    collapsed: !revealed,
    active: true,
    toggle,
    collapse,
  };
}
