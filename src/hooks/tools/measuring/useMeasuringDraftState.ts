import { useCallback, useMemo, useRef, useState } from "react";
import type { Feature, LineString, Polygon as GeoPolygon, MultiPolygon } from "geojson";
import { isActive, type AnnotationRecord } from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/geometry";
import {
  applyMeasuringFromKind,
  DEFAULT_MEASURING_FROM_KIND,
  firstAvailableMeasuringFromKind,
  measuringFromKind,
  measuringUsesAllPlacesInArea,
  usedMeasuringFromKinds,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "../../../domain/questions";
import type { SessionRulesInput } from "../../../domain/session/sessionRules";
import { adminBorderKindAvailability } from "../../../services/geo/adminDivisionAvailability";
import { usePreloadStore } from "../../../state/preloadStore";
import { availableMeasuringCatalog, isPreviewQuestionBeforeSendEnabled } from "../../../domain/session/sessionCatalogAvailability";
import type { MeasuringPlace } from "../../../domain/geo/types";
import type { GeocodedPlace } from "../../../services/geo/geocoding";
import type { SeaLevelEdgeCase } from "../../../domain/geometry/seaLevel";

export function useMeasuringDraftState(
  annotations: AnnotationRecord[],
  sessionRules?: SessionRulesInput,
) {
  const wizardStepRef = useRef("anchor");
  const seaLevelRequestIdRef = useRef(0);
  const coastlineRequestIdRef = useRef(0);
  const linearRequestIdRef = useRef(0);
  const placesRequestIdRef = useRef(0);

  const usedMeasuringFromKindsSet = useMemo(
    () => usedMeasuringFromKinds(annotations.filter(isActive)),
    [annotations],
  );

  const [measuringSeekerPoint, setMeasuringSeekerPoint] =
    useState<LatLngTuple | null>(null);
  const [measuringTargetPoint, setMeasuringTargetPoint] =
    useState<LatLngTuple | null>(null);
  const [measuringSubject, setMeasuringSubject] =
    useState<MeasuringSubject>("location");
  const [measuringLocationCategory, setMeasuringLocationCategory] =
    useState<MeasuringLocationCategory>(DEFAULT_MEASURING_FROM_KIND);
  const [measuringDistanceMeters, setMeasuringDistanceMeters] = useState<
    number | null
  >(null);
  const [measuringAnswer, setMeasuringAnswer] =
    useState<MeasuringAnswer | null>(null);
  const [measuringLoading, setMeasuringLoading] = useState(false);
  const [measuringError, setMeasuringError] = useState<string | null>(null);
  const [measuringCoastSegments, setMeasuringCoastSegments] = useState<
    Feature<LineString>[]
  >([]);
  const [coastlineContextVersion, setCoastlineContextVersion] = useState(0);
  const [measuringSeaLevelNearRegion, setMeasuringSeaLevelNearRegion] =
    useState<Feature<GeoPolygon | MultiPolygon> | null>(null);
  const [measuringAnchorElevationMeters, setMeasuringAnchorElevationMeters] =
    useState<number | null>(null);
  const [measuringSeaLevelEdgeCase, setMeasuringSeaLevelEdgeCase] =
    useState<SeaLevelEdgeCase | null>(null);
  const [measuringSeaLevelNote, setMeasuringSeaLevelNote] = useState<
    string | null
  >(null);
  const [measuringTargetMode, setMeasuringTargetMode] =
    useState<MeasuringTargetMode>("map");
  const [measuringSeekerPlaceName, setMeasuringSeekerPlaceName] = useState<
    string | null
  >(null);
  const [measuringTargetPlaceName, setMeasuringTargetPlaceName] = useState<
    string | null
  >(null);
  const [measuringSearchQuery, setMeasuringSearchQuery] = useState("");
  const [measuringSearchResults, setMeasuringSearchResults] = useState<
    GeocodedPlace[]
  >([]);
  const [measuringSearchLoading, setMeasuringSearchLoading] = useState(false);
  const [measuringSearchRole, setMeasuringSearchRole] = useState<
    "seeker" | "target"
  >("seeker");
  const [measuringPlaces, setMeasuringPlaces] = useState<MeasuringPlace[]>([]);
  const [measuringOptionChosen, setMeasuringOptionChosen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const customMeasureGeometries = sessionRules?.customMeasureGeometries ?? [];
  const customMatchingAreas = sessionRules?.customMatchingAreas;
  const adminDivisionCounts = usePreloadStore((state) => state.adminDivisionCounts);
  const regionPackId = sessionRules?.regionPackId;

  const measuringCatalog = useMemo(() => {
    const catalog = sessionRules
      ? availableMeasuringCatalog(sessionRules)
      : availableMeasuringCatalog({ gameSize: "medium" });
    return catalog.filter((option) =>
      adminBorderKindAvailability(option.id, adminDivisionCounts, regionPackId),
    );
  }, [adminDivisionCounts, regionPackId, sessionRules]);

  const previewBeforeSend = isPreviewQuestionBeforeSendEnabled(
    sessionRules ?? { gameSize: "medium" },
  );

  const measureFromKind = measuringFromKind(
    measuringSubject,
    measuringLocationCategory,
  );
  const usesAllPlacesInArea = measuringUsesAllPlacesInArea(measureFromKind);

  const clearSubjectDerivedState = useCallback(() => {
    setMeasuringTargetPoint(null);
    setMeasuringTargetPlaceName(null);
    setMeasuringDistanceMeters(null);
    setMeasuringAnswer(null);
    setMeasuringError(null);
    setMeasuringCoastSegments([]);
    setMeasuringSeaLevelNearRegion(null);
    setMeasuringAnchorElevationMeters(null);
    setMeasuringSeaLevelEdgeCase(null);
    setMeasuringSeaLevelNote(null);
    setMeasuringTargetMode("map");
    setMeasuringSearchQuery("");
    setMeasuringSearchResults([]);
    setMeasuringSearchLoading(false);
    setMeasuringPlaces([]);
  }, []);

  const resetDraft = useCallback(
    (additionalUsedKind?: MeasuringFromKind) => {
      const usedKinds = new Set(usedMeasuringFromKindsSet);
      if (additionalUsedKind) {
        usedKinds.add(additionalUsedKind);
      }

      const nextKind =
        firstAvailableMeasuringFromKind(usedKinds) ?? DEFAULT_MEASURING_FROM_KIND;
      const next = applyMeasuringFromKind(nextKind);

      setMeasuringSeekerPoint(null);
      setMeasuringTargetPoint(null);
      setMeasuringSubject(next.subject);
      setMeasuringLocationCategory(next.locationCategory);
      setMeasuringTargetMode("map");
      setMeasuringSeekerPlaceName(null);
      setMeasuringTargetPlaceName(null);
      setMeasuringSearchQuery("");
      setMeasuringSearchResults([]);
      setMeasuringSearchLoading(false);
      setMeasuringSearchRole("seeker");
      setMeasuringDistanceMeters(null);
      setMeasuringCoastSegments([]);
      setMeasuringSeaLevelNearRegion(null);
      setMeasuringAnchorElevationMeters(null);
      setMeasuringSeaLevelEdgeCase(null);
      setMeasuringSeaLevelNote(null);
      setMeasuringAnswer(null);
      setMeasuringError(null);
      setMeasuringPlaces([]);
      setMeasuringOptionChosen(false);
    },
    [usedMeasuringFromKindsSet],
  );

  return {
    wizardStepRef,
    seaLevelRequestIdRef,
    coastlineRequestIdRef,
    linearRequestIdRef,
    placesRequestIdRef,
    usedMeasuringFromKindsSet,
    measuringSeekerPoint,
    setMeasuringSeekerPoint,
    measuringTargetPoint,
    setMeasuringTargetPoint,
    measuringSubject,
    setMeasuringSubject,
    measuringLocationCategory,
    setMeasuringLocationCategory,
    measuringDistanceMeters,
    setMeasuringDistanceMeters,
    measuringAnswer,
    setMeasuringAnswer,
    measuringLoading,
    setMeasuringLoading,
    measuringError,
    setMeasuringError,
    measuringCoastSegments,
    setMeasuringCoastSegments,
    coastlineContextVersion,
    setCoastlineContextVersion,
    measuringSeaLevelNearRegion,
    setMeasuringSeaLevelNearRegion,
    measuringAnchorElevationMeters,
    setMeasuringAnchorElevationMeters,
    measuringSeaLevelEdgeCase,
    setMeasuringSeaLevelEdgeCase,
    measuringSeaLevelNote,
    setMeasuringSeaLevelNote,
    measuringTargetMode,
    setMeasuringTargetMode,
    measuringSeekerPlaceName,
    setMeasuringSeekerPlaceName,
    measuringTargetPlaceName,
    setMeasuringTargetPlaceName,
    measuringSearchQuery,
    setMeasuringSearchQuery,
    measuringSearchResults,
    setMeasuringSearchResults,
    measuringSearchLoading,
    setMeasuringSearchLoading,
    measuringSearchRole,
    setMeasuringSearchRole,
    measuringPlaces,
    setMeasuringPlaces,
    measuringOptionChosen,
    setMeasuringOptionChosen,
    previewOpen,
    setPreviewOpen,
    customMeasureGeometries,
    customMatchingAreas,
    adminDivisionCounts,
    regionPackId,
    measuringCatalog,
    previewBeforeSend,
    measureFromKind,
    usesAllPlacesInArea,
    clearSubjectDerivedState,
    resetDraft,
  };
}

export type MeasuringDraftState = ReturnType<typeof useMeasuringDraftState>;
