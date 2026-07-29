import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    if (!landscapeActive) {
      setRevealed(false);
    }
  }, [landscapeActive]);

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
