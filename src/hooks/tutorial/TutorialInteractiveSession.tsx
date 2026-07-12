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
import type { QuestionTutorialId } from "../../domain/tutorial/tutorialQuestions";
import type { TentaclePoi } from "../../domain/map/annotations";
import type { MatchingCategoryId, MeasuringFromKind } from "../../domain/questions";
import type { TentacleExtendedCategoryId } from "../../domain/questions/tentacleQuestions";
import {
  MOCK_MATCHING_FEATURE_COUNT,
  mockMatchingCategoryName,
  mockMeasuringTargetName,
} from "../../domain/wizard/tutorialInteractiveMocks";
import {
  getCurrentPosition,
  unknownGeolocationErrorMessage,
} from "../../services/core/geolocation";
import { getTentacleLocationCategory } from "../../domain/questions/tentacleQuestions";

const MOCK_RESOLVE_MS = 450;

export interface TutorialInteractiveSessionValue {
  anchorLat: number | null;
  anchorLng: number | null;
  hasAnchor: boolean;
  hasCenter: boolean;
  gpsLoading: boolean;
  gpsError: string | null;
  placeAt: (lat: number, lng: number) => void;
  useGps: () => void;
  refreshMockResolve: () => void;
  configureMock: (patch: Partial<TutorialMockContext>) => void;
  matchingLoading: boolean;
  matchingNearestFeatureName: string | null;
  matchingDistanceMeters: number | null;
  matchingFeatureCount: number | null;
  matchingInPlayAreaFeatureCount: number | null;
  measuringLoading: boolean;
  measuringTargetPlaceName: string | null;
  measuringDistanceMeters: number | null;
  tentacleLoading: boolean;
  tentaclePoiOptions: TentaclePoi[];
}

const TutorialInteractiveSessionContext =
  createContext<TutorialInteractiveSessionValue | null>(null);

interface TutorialMockContext {
  matchingCategoryId: MatchingCategoryId;
  measuringFromKind: MeasuringFromKind;
  tentacleCategoryId: TentacleExtendedCategoryId;
}

const DEFAULT_MOCK_CONTEXT: TutorialMockContext = {
  matchingCategoryId: "park",
  measuringFromKind: "park",
  tentacleCategoryId: "museum",
};

function offsetPois(
  anchorLat: number,
  anchorLng: number,
  categoryId: TentacleExtendedCategoryId,
): TentaclePoi[] {
  const label = getTentacleLocationCategory(categoryId).label.toLowerCase();
  return [
    {
      id: "tutorial-poi-1",
      name: `Nearby ${label}`,
      lat: anchorLat + 0.012,
      lng: anchorLng + 0.018,
      category: categoryId,
    },
    {
      id: "tutorial-poi-2",
      name: `Local ${label}`,
      lat: anchorLat - 0.008,
      lng: anchorLng + 0.01,
      category: categoryId,
    },
  ];
}

export function TutorialInteractiveSessionProvider({
  toolId,
  children,
}: {
  toolId: QuestionTutorialId;
  children: ReactNode;
}) {
  const [anchorLat, setAnchorLat] = useState<number | null>(null);
  const [anchorLng, setAnchorLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingNearestFeatureName, setMatchingNearestFeatureName] = useState<
    string | null
  >(null);
  const [matchingDistanceMeters, setMatchingDistanceMeters] = useState<
    number | null
  >(null);
  const [matchingFeatureCount, setMatchingFeatureCount] = useState<number | null>(
    null,
  );
  const [matchingInPlayAreaFeatureCount, setMatchingInPlayAreaFeatureCount] =
    useState<number | null>(null);
  const [measuringLoading, setMeasuringLoading] = useState(false);
  const [measuringTargetPlaceName, setMeasuringTargetPlaceName] = useState<
    string | null
  >(null);
  const [measuringDistanceMeters, setMeasuringDistanceMeters] = useState<
    number | null
  >(null);
  const [tentacleLoading, setTentacleLoading] = useState(false);
  const [tentaclePoiOptions, setTentaclePoiOptions] = useState<TentaclePoi[]>(
    [],
  );
  const resolveTimerRef = useRef<number | null>(null);
  const mockContextRef = useRef<TutorialMockContext>(DEFAULT_MOCK_CONTEXT);

  const clearResolveTimer = useCallback(() => {
    if (resolveTimerRef.current !== null) {
      window.clearTimeout(resolveTimerRef.current);
      resolveTimerRef.current = null;
    }
  }, []);

  const runMockResolve = useCallback(
    (lat: number, lng: number) => {
      clearResolveTimer();
      const mock = mockContextRef.current;
      switch (toolId) {
        case "matching":
          setMatchingLoading(true);
          setMatchingNearestFeatureName(null);
          setMatchingDistanceMeters(null);
          setMatchingFeatureCount(null);
          setMatchingInPlayAreaFeatureCount(null);
          resolveTimerRef.current = window.setTimeout(() => {
            setMatchingLoading(false);
            setMatchingNearestFeatureName(
              `Nearby ${mockMatchingCategoryName(mock.matchingCategoryId)}`,
            );
            setMatchingDistanceMeters(420);
            setMatchingFeatureCount(MOCK_MATCHING_FEATURE_COUNT);
            setMatchingInPlayAreaFeatureCount(MOCK_MATCHING_FEATURE_COUNT - 1);
          }, MOCK_RESOLVE_MS);
          break;
        case "measuring":
          setMeasuringLoading(true);
          setMeasuringTargetPlaceName(null);
          setMeasuringDistanceMeters(null);
          resolveTimerRef.current = window.setTimeout(() => {
            setMeasuringLoading(false);
            setMeasuringTargetPlaceName(
              `Nearby ${mockMeasuringTargetName(mock.measuringFromKind)}`,
            );
            setMeasuringDistanceMeters(2400);
          }, MOCK_RESOLVE_MS);
          break;
        case "tentacle":
          setTentacleLoading(true);
          setTentaclePoiOptions([]);
          resolveTimerRef.current = window.setTimeout(() => {
            setTentacleLoading(false);
            setTentaclePoiOptions(
              offsetPois(lat, lng, mock.tentacleCategoryId),
            );
          }, MOCK_RESOLVE_MS);
          break;
        case "radar":
        case "thermometer":
        case "photo":
          break;
        default: {
          const _exhaustive: never = toolId;
          return _exhaustive;
        }
      }
    },
    [clearResolveTimer, toolId],
  );

  const refreshMockResolve = useCallback(() => {
    if (anchorLat !== null && anchorLng !== null) {
      runMockResolve(anchorLat, anchorLng);
    }
  }, [anchorLat, anchorLng, runMockResolve]);

  const configureMock = useCallback(
    (patch: Partial<TutorialMockContext>) => {
      mockContextRef.current = { ...mockContextRef.current, ...patch };
      refreshMockResolve();
    },
    [refreshMockResolve],
  );

  const placeAt = useCallback(
    (lat: number, lng: number) => {
      setAnchorLat(lat);
      setAnchorLng(lng);
      setGpsError(null);
      runMockResolve(lat, lng);
    },
    [runMockResolve],
  );

  const useGps = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);
    void getCurrentPosition({ highAccuracy: true })
      .then((reading) => {
        placeAt(reading.lat, reading.lng);
      })
      .catch((error) => {
        setGpsError(unknownGeolocationErrorMessage(error));
      })
      .finally(() => {
        setGpsLoading(false);
      });
  }, [placeAt]);

  useEffect(() => clearResolveTimer, [clearResolveTimer]);

  const hasAnchor = anchorLat !== null && anchorLng !== null;

  const value = useMemo(
    (): TutorialInteractiveSessionValue => ({
      anchorLat,
      anchorLng,
      hasAnchor,
      hasCenter: hasAnchor,
      gpsLoading,
      gpsError,
      placeAt,
      useGps,
      refreshMockResolve,
      configureMock,
      matchingLoading,
      matchingNearestFeatureName,
      matchingDistanceMeters,
      matchingFeatureCount,
      matchingInPlayAreaFeatureCount,
      measuringLoading,
      measuringTargetPlaceName,
      measuringDistanceMeters,
      tentacleLoading,
      tentaclePoiOptions,
    }),
    [
      anchorLat,
      anchorLng,
      hasAnchor,
      gpsLoading,
      gpsError,
      placeAt,
      useGps,
      refreshMockResolve,
      configureMock,
      matchingLoading,
      matchingNearestFeatureName,
      matchingDistanceMeters,
      matchingFeatureCount,
      matchingInPlayAreaFeatureCount,
      measuringLoading,
      measuringTargetPlaceName,
      measuringDistanceMeters,
      tentacleLoading,
      tentaclePoiOptions,
    ],
  );

  return (
    <TutorialInteractiveSessionContext.Provider value={value}>
      {children}
    </TutorialInteractiveSessionContext.Provider>
  );
}

export function useTutorialInteractiveSession() {
  return useContext(TutorialInteractiveSessionContext);
}
