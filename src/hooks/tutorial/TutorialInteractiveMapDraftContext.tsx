/* eslint-disable react-refresh/only-export-components -- context module pairs provider with hooks */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import { buildMapDraftOverlays } from "../map-screen/useMapDraftOverlays";
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
  overlays: ReturnType<typeof buildMapDraftOverlays>["overlays"];
  eliminationFeatures: Feature<GeoPolygon | MultiPolygon>[];
}

const TutorialInteractiveMapDraftContext =
  createContext<TutorialInteractiveMapDraftContextValue | null>(null);

export function TutorialInteractiveMapDraftProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<TutorialInteractiveMapDraftState>({
    sources: null,
    extraEliminationFeatures: [],
  });

  const registerMapDraft = useCallback(
    (
      sources: MapDraftOverlaySources | null,
      extraEliminationFeatures: Feature<GeoPolygon | MultiPolygon>[] = [],
    ) => {
      setDraft({ sources, extraEliminationFeatures });
    },
    [],
  );

  const { overlays, eliminationFeatures } = useMemo(() => {
    if (!draft.sources) {
      return { overlays: [], eliminationFeatures: [] };
    }

    const built = buildMapDraftOverlays(draft.sources);
    return {
      overlays: built.overlays,
      eliminationFeatures: [
        ...built.eliminationFeatures,
        ...draft.extraEliminationFeatures,
      ],
    };
  }, [draft.extraEliminationFeatures, draft.sources]);

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
