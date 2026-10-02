import type { Feature, Polygon as GeoPolygon, LineString, MultiPolygon } from "geojson";
import { useCallback, useMemo, useRef, useState } from "react";
import type { MeasuringPlace } from "@/domain/geo/types";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { SeaLevelEdgeCase } from "@/domain/geometry/measuring/seaLevel";
import { type AnnotationRecord, isActive } from "@/domain/map/annotations";
import {
  applyMeasuringFromKind,
  DEFAULT_MEASURING_FROM_KIND,
  firstAvailableMeasuringFromKind,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
  measuringFromKind,
  measuringUsesAllPlacesInArea,
  usedMeasuringFromKindsForSession,
} from "@/domain/questions";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import {
  availableMeasuringCatalog,
  isPreviewQuestionBeforeSendEnabled,
} from "@/domain/session/catalog/sessionCatalogAvailability";
import type { SessionRulesInput } from "@/domain/session/rules";
import type { GeocodedPlace } from "@/services/geo/geocoding";
import { adminBorderKindAvailability } from "@/services/geo/overpass/adminDivisionAvailability";
import { usePreloadStore } from "@/state/preloadStore";

export function useMeasuringDraftState(
  annotations: AnnotationRecord[],
  pendingQuestions: readonly PendingQuestionRecord[] = [],
  sessionRules?: SessionRulesInput,
) {
  const wizardStepRef = useRef("place");
  const setWizardStep = useCallback((step: string) => {
    wizardStepRef.current = step;
  }, []);
  const seaLevelRequestIdRef = useRef(0);
  const coastlineRequestIdRef = useRef(0);
  const linearRequestIdRef = useRef(0);
  const placesRequestIdRef = useRef(0);

  const usedMeasuringFromKindsSet = useMemo(
    () => usedMeasuringFromKindsForSession(annotations.filter(isActive), pendingQuestions),
    [annotations, pendingQuestions],
  );

  const [measuringSeekerPoint, setMeasuringSeekerPoint] = useState<LatLngTuple | null>(null);
  const [measuringTargetPoint, setMeasuringTargetPoint] = useState<LatLngTuple | null>(null);
  const [measuringSubject, setMeasuringSubject] = useState<MeasuringSubject>("location");
  const [measuringLocationCategory, setMeasuringLocationCategory] =
    useState<MeasuringLocationCategory>(DEFAULT_MEASURING_FROM_KIND);
  const [measuringDistanceMeters, setMeasuringDistanceMeters] = useState<number | null>(null);
  const [measuringAnswer, setMeasuringAnswer] = useState<MeasuringAnswer | null>(null);
  const [measuringLoading, setMeasuringLoading] = useState(false);
  const [measuringError, setMeasuringError] = useState<string | null>(null);
  const [measuringCoastSegments, setMeasuringCoastSegments] = useState<Feature<LineString>[]>([]);
  const [coastlineContextVersion, setCoastlineContextVersion] = useState(0);
  const [measuringSeaLevelNearRegion, setMeasuringSeaLevelNearRegion] = useState<Feature<
    GeoPolygon | MultiPolygon
  > | null>(null);
  const [measuringAnchorElevationMeters, setMeasuringAnchorElevationMeters] = useState<
    number | null
  >(null);
  const [measuringSeaLevelEdgeCase, setMeasuringSeaLevelEdgeCase] =
    useState<SeaLevelEdgeCase | null>(null);
  const [measuringSeaLevelNote, setMeasuringSeaLevelNote] = useState<string | null>(null);
  const [measuringTargetMode, setMeasuringTargetMode] = useState<MeasuringTargetMode>("map");
  const [measuringSeekerPlaceName, setMeasuringSeekerPlaceName] = useState<string | null>(null);
  const [measuringTargetPlaceName, setMeasuringTargetPlaceName] = useState<string | null>(null);
  const [measuringSearchQuery, setMeasuringSearchQuery] = useState("");
  const [measuringSearchResults, setMeasuringSearchResults] = useState<GeocodedPlace[]>([]);
  const [measuringSearchLoading, setMeasuringSearchLoading] = useState(false);
  const [measuringSearchRole, setMeasuringSearchRole] = useState<"seeker" | "target">("seeker");
  const [measuringPlaces, setMeasuringPlaces] = useState<MeasuringPlace[]>([]);
  const [measuringOptionChosen, setMeasuringOptionChosen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [unavailableMeasuringFromKinds, setUnavailableMeasuringFromKinds] = useState<
    Map<MeasuringFromKind, string>
  >(() => new Map());
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);

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

  const measureFromKind = measuringFromKind(measuringSubject, measuringLocationCategory);
  const usesAllPlacesInArea = measuringUsesAllPlacesInArea(measureFromKind);

  const clearSubjectDerivedState = useCallback(() => {
    placesRequestIdRef.current += 1;
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
      placesRequestIdRef.current += 1;
      seaLevelRequestIdRef.current += 1;
      coastlineRequestIdRef.current += 1;
      linearRequestIdRef.current += 1;

      const usedKinds = new Set(usedMeasuringFromKindsSet);
      if (additionalUsedKind) {
        usedKinds.add(additionalUsedKind);
      }

      const nextKind =
        firstAvailableMeasuringFromKind(usedKinds, measuringCatalog) ?? DEFAULT_MEASURING_FROM_KIND;
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
      setUnavailableMeasuringFromKinds(new Map());
      setCatalogNotice(null);
    },
    [measuringCatalog, usedMeasuringFromKindsSet],
  );

  const reopenCatalog = useCallback(() => {
    setMeasuringLoading(false);
    setMeasuringOptionChosen(false);
    setMeasuringSeekerPoint(null);
    setMeasuringSeekerPlaceName(null);
    clearSubjectDerivedState();
  }, [clearSubjectDerivedState]);

  return {
    wizardStepRef,
    setWizardStep,
    seaLevelRequestIdRef,
    coastlineRequestIdRef,
    linearRequestIdRef,
    placesRequestIdRef,
    usedMeasuringFromKindsSet,
    unavailableMeasuringFromKinds,
    setUnavailableMeasuringFromKinds,
    catalogNotice,
    setCatalogNotice,
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
    reopenCatalog,
  };
}

export type MeasuringDraftState = ReturnType<typeof useMeasuringDraftState>;
