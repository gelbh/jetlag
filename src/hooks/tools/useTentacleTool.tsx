import { useCallback, useMemo, useState } from "react";
import { TentaclePanel } from "../../components/tools/TentaclePanel";
import type { LatLngTuple } from "../../domain/geometry";
import {
  isActive,
  type AnnotationRecord,
  type GameArea,
  type TentaclePoi,
} from "../../domain/annotations";
import {
  buildTentacleEliminationRegion,
  tentacleEliminationJsonForAnswer,
} from "../../domain/tentacleGeometry";
import type { DistanceUnit } from "../../domain/distance";
import {
  defaultTentacleCategoryId,
  firstAvailableTentacleCategoryId,
  isTentacleCategoryAvailable,
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_SEARCH_RADIUS_METERS,
  usedTentacleCategoryIds,
  type TentacleLocationCategoryId,
} from "../../domain/tentacleQuestions";
import { fetchTentaclePois } from "../../services/overpass";
import { useToolSessionOptions } from "./useToolSessionOptions";

interface UseTentacleToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  setMapError: (message: string | null) => void;
  mapError: string | null;
  gpsLoading: boolean;
  gpsError?: string | null;
  awaitingPlacement: boolean;
  setAwaitingPlacement: (awaiting: boolean) => void;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  armPlacement: () => void;
}

export function useTentacleTool({
  active,
  annotations,
  gameArea,
  createAnnotation,
  distanceUnit,
  finishPlacement,
  setMapError,
  mapError,
  gpsLoading,
  gpsError,
  awaitingPlacement,
  setAwaitingPlacement,
  refreshGps,
  ensurePointInGameArea,
  armPlacement,
}: UseTentacleToolParams) {
  const usedTentacleCategories = useMemo(
    () => usedTentacleCategoryIds(annotations.filter(isActive)),
    [annotations],
  );
  const [tentacleCenter, setTentacleCenter] = useState<LatLngTuple | null>(
    null,
  );
  const [tentacleCategoryId, setTentacleCategoryId] =
    useState<TentacleLocationCategoryId>(defaultTentacleCategoryId());
  const [tentaclePois, setTentaclePois] = useState<TentaclePoi[]>([]);
  const [tentacleOutOfReach, setTentacleOutOfReach] = useState(false);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [tentacleLoading, setTentacleLoading] = useState(false);
  const [tentacleError, setTentacleError] = useState<string | null>(null);

  useToolSessionOptions({
    active,
    usedOptions: usedTentacleCategories,
    currentOption: tentacleCategoryId,
    isAvailable: (usedOptions, currentOption) =>
      isTentacleCategoryAvailable(currentOption, usedOptions),
    pickNext: firstAvailableTentacleCategoryId,
    onUnavailable: useCallback((nextCategory: TentacleLocationCategoryId) => {
      setTentacleCategoryId(nextCategory);
      setTentaclePois([]);
      setTentacleOutOfReach(false);
      setSelectedPoiId(null);
      setTentacleError(null);
    }, []),
  });

  const resetDraft = () => {
    setTentacleCenter(null);
    setTentacleCategoryId(defaultTentacleCategoryId(usedTentacleCategories));
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setTentacleLoading(false);
    setTentacleError(null);
  };

  const handleMapClick = (point: LatLngTuple) => {
    if (!active) {
      return false;
    }

    setTentacleCenter(point);
    setAwaitingPlacement(false);
    setMapError(null);
    return true;
  };

  const handleUseGps = async () => {
    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        return;
      }

      setTentacleCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
    } catch (error) {
      setMapError(
        error instanceof Error ? error.message : "Unable to read GPS location.",
      );
    }
  };

  const loadPois = async () => {
    if (!tentacleCenter) {
      return;
    }

    setTentacleLoading(true);
    setTentacleError(null);
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);

    try {
      const pois = await fetchTentaclePois(
        tentacleCenter,
        TENTACLE_SEARCH_RADIUS_METERS,
        tentacleCategoryId,
      );
      setTentaclePois(pois);
      if (pois.length === 0) {
        setTentacleError("No named locations were found within 1 mile.");
      }
    } catch (error) {
      setTentacleError(
        error instanceof Error ? error.message : "Unable to load locations.",
      );
    } finally {
      setTentacleLoading(false);
    }
  };

  const tentacleEliminationPreview = useMemo(() => {
    if (
      !tentacleCenter ||
      tentacleOutOfReach ||
      !selectedPoiId ||
      tentaclePois.length < 2
    ) {
      return null;
    }

    return buildTentacleEliminationRegion(
      tentacleCenter,
      TENTACLE_ANSWER_RADIUS_METERS,
      tentaclePois,
      selectedPoiId,
      gameArea,
    );
  }, [
    gameArea,
    selectedPoiId,
    tentacleCenter,
    tentacleOutOfReach,
    tentaclePois,
  ]);

  const commit = async () => {
    if (!tentacleCenter) {
      setMapError("Choose a center with GPS or a map tap.");
      return;
    }

    if (tentaclePois.length === 0) {
      setMapError("Load locations before adding the tentacle question.");
      return;
    }

    if (!tentacleOutOfReach && !selectedPoiId) {
      setMapError("Record the answer before adding the tentacle question.");
      return;
    }

    if (
      !isTentacleCategoryAvailable(tentacleCategoryId, usedTentacleCategories)
    ) {
      setMapError("That location type was already used this session.");
      return;
    }

    const selectedPoi = tentaclePois.find((poi) => poi.id === selectedPoiId);
    const eliminationJson = tentacleEliminationJsonForAnswer({
      anchor: tentacleCenter,
      radiusMeters: TENTACLE_ANSWER_RADIUS_METERS,
      pois: tentaclePois,
      answeredPoiId: selectedPoi?.id,
      outOfReach: tentacleOutOfReach,
      gameArea,
    });

    const metadata: AnnotationRecord["metadata"] = {
      createdAt: new Date().toISOString(),
      radiusMeters: TENTACLE_SEARCH_RADIUS_METERS,
      tentacleAnswerRadiusMeters: tentacleOutOfReach
        ? undefined
        : TENTACLE_ANSWER_RADIUS_METERS,
      tentacleCategoryId,
      tentacleOutOfReach,
      highlightedPoiId: selectedPoi?.id,
      tentacleAnswerPoiName: selectedPoi?.name,
      poiIds: tentaclePois.map((poi) => poi.id),
      pois: tentaclePois,
      color: "#22c55e",
    };
    if (eliminationJson !== undefined) {
      metadata.tentacleEliminationJson = eliminationJson;
    }

    await createAnnotation({
      type: "tentacle",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [tentacleCenter[1], tentacleCenter[0]],
        },
      },
      metadata,
    });

    setTentacleCenter(null);
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setMapError(null);
    finishPlacement();
  };

  const placementCrosshair =
    active && (awaitingPlacement || tentacleCenter === null);

  const panel = (
    <TentaclePanel
      categoryId={tentacleCategoryId}
      usedCategoryIds={usedTentacleCategories}
      distanceUnit={distanceUnit}
      poiOptions={tentaclePois}
      selectedPoiId={selectedPoiId}
      outOfReach={tentacleOutOfReach}
      loading={tentacleLoading}
      awaitingPlacement={awaitingPlacement}
      hasCenter={tentacleCenter !== null}
      gpsLoading={gpsLoading}
      error={tentacleError ?? mapError ?? gpsError}
      onCategoryChange={(nextCategory) => {
        setTentacleCategoryId(nextCategory);
        setTentaclePois([]);
        setTentacleOutOfReach(false);
        setSelectedPoiId(null);
        setTentacleError(null);
      }}
      onUseGps={() => void handleUseGps()}
      onPlaceAtMapTap={armPlacement}
      onLoadPois={() => void loadPois()}
      onSelectPoi={(poiId) => {
        setTentacleOutOfReach(false);
        setSelectedPoiId(poiId);
      }}
      onOutOfReachChange={(nextOutOfReach) => {
        setTentacleOutOfReach(nextOutOfReach);
        if (nextOutOfReach) {
          setSelectedPoiId(null);
        }
      }}
      onCommit={() => void commit()}
    />
  );

  return {
    draft: {
      tentacleCenter,
      tentacleSearchRadiusMeters: TENTACLE_SEARCH_RADIUS_METERS,
      tentacleAnswerRadiusMeters: TENTACLE_ANSWER_RADIUS_METERS,
      tentaclePois,
      tentacleSelectedPoiId: selectedPoiId,
      tentacleOutOfReach,
      tentacleEliminationPreview,
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit,
    panel,
  };
}
