/* eslint-disable react-refresh/only-export-components -- context module pairs provider with hooks */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import {
  buildMapDraftOverlays,
  type MapDraftOverlayResult,
} from "../map-screen/useMapDraftOverlays";
import type { MapDraftOverlaySources } from "../map-screen/useMapDraftOverlays";

interface TutorialInteractiveMapDraftState {
  sources: MapDraftOverlaySources | null;
  extraEliminationFeatures: Feature<GeoPolygon | MultiPolygon>[];
}

interface TutorialInteractiveMapDraftContextValue {
  registerMapDraft: (
    sources: MapDraftOverlaySources | null,
    extraEliminationFeatures?: Feature<GeoPolygon | MultiPolygon>[],
  ) => void;
  activeTool: MapDraftOverlaySources["activeTool"];
  sources: MapDraftOverlaySources | null;
  overlays: MapDraftOverlayResult["overlays"];
  eliminationFeatures: Feature<GeoPolygon | MultiPolygon>[];
}

const TutorialInteractiveMapDraftContext =
  createContext<TutorialInteractiveMapDraftContextValue | null>(null);

const EMPTY_BUILT: MapDraftOverlayResult = {
  overlays: [],
  eliminationFeatures: [],
};

export function TutorialInteractiveMapDraftProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<TutorialInteractiveMapDraftState>({
    sources: null,
    extraEliminationFeatures: [],
  });
  const [built, setBuilt] = useState<MapDraftOverlayResult>(EMPTY_BUILT);
  const generationRef = useRef(0);

  const registerMapDraft = useCallback(
    (
      sources: MapDraftOverlaySources | null,
      extraEliminationFeatures: Feature<GeoPolygon | MultiPolygon>[] = [],
    ) => {
      setDraft({ sources, extraEliminationFeatures });
    },
    [],
  );

  useEffect(() => {
    if (!draft.sources) {
      setBuilt(EMPTY_BUILT);
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;

    void buildMapDraftOverlays(draft.sources).then((result) => {
      if (generation === generationRef.current) {
        setBuilt(result);
      }
    });
  }, [draft.sources]);

  const overlays = built.overlays;
  const eliminationFeatures = useMemo(
    () => [...built.eliminationFeatures, ...draft.extraEliminationFeatures],
    [built.eliminationFeatures, draft.extraEliminationFeatures],
  );

  const value = useMemo(
    (): TutorialInteractiveMapDraftContextValue => ({
      registerMapDraft,
      activeTool: draft.sources?.activeTool ?? "none",
      sources: draft.sources,
      overlays,
      eliminationFeatures,
    }),
    [draft.sources, eliminationFeatures, overlays, registerMapDraft],
  );

  return (
    <TutorialInteractiveMapDraftContext.Provider value={value}>
      {children}
    </TutorialInteractiveMapDraftContext.Provider>
  );
}

const noopRegisterMapDraft: TutorialInteractiveMapDraftContextValue["registerMapDraft"] =
  () => {
    /* read-only previews render outside the interactive provider */
  };

export function useRegisterTutorialMapDraft() {
  const context = useContext(TutorialInteractiveMapDraftContext);
  return context?.registerMapDraft ?? noopRegisterMapDraft;
}

export function useTutorialInteractiveMapDraft() {
  const context = useContext(TutorialInteractiveMapDraftContext);
  return {
    activeTool: context?.activeTool ?? "none",
    sources: context?.sources ?? null,
    overlays: context?.overlays ?? [],
    eliminationFeatures: context?.eliminationFeatures ?? [],
  };
}
