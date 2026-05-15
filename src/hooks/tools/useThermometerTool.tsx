import { useCallback, useMemo, useState } from "react";
import type { Feature, LineString } from "geojson";
import { ThermometerPanel } from "../../components/tools/ThermometerPanel";
import type { LatLngTuple } from "../../domain/geometry";
import { distanceBetweenPoints } from "../../domain/geometry";
import { isActive, type AnnotationRecord } from "../../domain/annotations";
import {
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  firstAvailableThermometerDistanceMeters,
  isThermometerDistanceOptionAvailable,
  thermometerHotterTowards,
  usedThermometerDistanceOptions,
  type ThermometerAnswer,
  type ThermometerDistanceOptionMiles,
} from "../../domain/thermometerQuestions";
import type { DistanceUnit } from "../../domain/distance";
import { useToolSessionOptions } from "./useToolSessionOptions";

interface UseThermometerToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  setMapError: (message: string | null) => void;
}

export function useThermometerTool({
  active,
  annotations,
  createAnnotation,
  distanceUnit,
  finishPlacement,
  setMapError,
}: UseThermometerToolParams) {
  const usedThermometerOptions = useMemo(
    () => usedThermometerDistanceOptions(annotations.filter(isActive)),
    [annotations],
  );
  const [thermoA, setThermoA] = useState<LatLngTuple | null>(null);
  const [thermoB, setThermoB] = useState<LatLngTuple | null>(null);
  const [thermometerDistanceMeters, setThermometerDistanceMeters] = useState(
    DEFAULT_THERMOMETER_DISTANCE_METERS,
  );
  const [thermometerAnswer, setThermometerAnswer] =
    useState<ThermometerAnswer | null>(null);

  const thermoStep: "a" | "b" | "ready" = !thermoA
    ? "a"
    : !thermoB
      ? "b"
      : "ready";
  const thermoTravelMeters =
    thermoA && thermoB ? distanceBetweenPoints(thermoA, thermoB) : null;

  useToolSessionOptions({
    active,
    usedOptions: usedThermometerOptions,
    currentOption: thermometerDistanceMeters,
    isAvailable: (usedOptions, currentOption) =>
      isThermometerDistanceOptionAvailable(
        usedOptions as ReadonlySet<ThermometerDistanceOptionMiles>,
        currentOption,
      ),
    pickNext: (usedOptions) =>
      firstAvailableThermometerDistanceMeters(
        usedOptions as ReadonlySet<ThermometerDistanceOptionMiles>,
      ),
    onUnavailable: useCallback((nextDistance: number) => {
      setThermometerDistanceMeters(nextDistance);
    }, []),
  });

  const resetDraft = () => {
    setThermoA(null);
    setThermoB(null);
    setThermometerDistanceMeters(DEFAULT_THERMOMETER_DISTANCE_METERS);
    setThermometerAnswer(null);
  };

  const handleMapClick = (point: LatLngTuple) => {
    if (!active) {
      return false;
    }

    if (!thermoA) {
      setThermoA(point);
    } else if (!thermoB) {
      setThermoB(point);
    }

    return true;
  };

  const commit = async () => {
    if (!thermoA || !thermoB || thermometerAnswer === null) {
      return;
    }

    if (
      !isThermometerDistanceOptionAvailable(
        usedThermometerOptions,
        thermometerDistanceMeters,
      )
    ) {
      setMapError("That thermometer distance was already used this session.");
      return;
    }

    const geometry: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [thermoA[1], thermoA[0]],
          [thermoB[1], thermoB[0]],
        ],
      },
    };

    await createAnnotation({
      type: "thermometer",
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        hotterTowards: thermometerHotterTowards(thermometerAnswer),
        thermometerDistanceMeters,
        thermometerAnswer,
        color: "#ef4444",
      },
    });

    resetDraft();
    finishPlacement();
  };

  const placementCrosshair = active && thermoStep !== "ready";

  const panel = (
    <ThermometerPanel
      distanceUnit={distanceUnit}
      distanceMeters={thermometerDistanceMeters}
      travelMeters={thermoTravelMeters}
      answer={thermometerAnswer}
      step={thermoStep}
      usedDistanceOptions={usedThermometerOptions}
      onDistanceChange={setThermometerDistanceMeters}
      onAnswerChange={setThermometerAnswer}
      onReset={resetDraft}
      onCommit={() => void commit()}
    />
  );

  return {
    draft: {
      thermoA,
      thermoB,
      thermometerAnswer,
      thermometerDistanceMeters,
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit,
    panel,
  };
}
