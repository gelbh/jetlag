/* eslint-disable react-refresh/only-export-components -- context module pairs provider with hooks */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LatLngBoundsExpression } from "leaflet";
import type { GameArea } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  defaultTutorialMapViewport,
  resolveTutorialMapViewport,
  type TutorialMapViewport,
} from "../../domain/wizard/tutorialMapViewport";
import { gameAreaToBoundingBox } from "../../domain/geometry/gameAreaBounds";

interface TutorialMapViewportContextValue {
  viewport: TutorialMapViewport;
  loading: boolean;
  focusBounds: LatLngBoundsExpression;
}

const TutorialMapViewportContext =
  createContext<TutorialMapViewportContextValue | null>(null);

function boundsFromGameArea(gameArea: GameArea): LatLngBoundsExpression {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  return [
    [south, west],
    [north, east],
  ];
}

export function TutorialMapViewportProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<TutorialMapViewport>(
    defaultTutorialMapViewport(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void resolveTutorialMapViewport()
      .then((next) => {
        if (!cancelled) {
          setViewport(next);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const focusBounds = useMemo(
    () => boundsFromGameArea(viewport.gameArea),
    [viewport.gameArea],
  );

  const value = useMemo(
    () => ({
      viewport,
      loading,
      focusBounds,
    }),
    [viewport, loading, focusBounds],
  );

  return (
    <TutorialMapViewportContext.Provider value={value}>
      {children}
    </TutorialMapViewportContext.Provider>
  );
}

export function useTutorialMapViewport() {
  const context = useContext(TutorialMapViewportContext);
  if (!context) {
    return {
      viewport: defaultTutorialMapViewport(),
      loading: false,
      focusBounds: boundsFromGameArea(defaultTutorialMapViewport().gameArea),
    };
  }
  return context;
}

export function useTutorialMapCenter(): LatLngTuple {
  return useTutorialMapViewport().viewport.center;
}
