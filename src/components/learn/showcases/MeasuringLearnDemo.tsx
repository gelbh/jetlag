import { useMemo, useState } from "react";
import { MeasuringHudBody } from "@/components/tools/ask/measuring/MeasuringHudBody";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  BASE_MEASURING_CATALOG,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringSubject,
  measuringTargetKind,
} from "@/domain/questions";

const DISTANCE_UNIT: DistanceUnit = "metric";
const EMPTY_USED = new Set<MeasuringFromKind>();

function subjectFor(kind: MeasuringFromKind): MeasuringSubject {
  const target = measuringTargetKind(kind);
  if (target === "coastline") return "coastline";
  if (target === "sea_level") return "sea_level";
  return "location";
}

/** Live Measuring catalog; after a pick, shows a canned nearer/further resolve. */
export function MeasuringLearnDemo() {
  const [measureFrom, setMeasureFrom] = useState<MeasuringFromKind>(BASE_MEASURING_CATALOG[0]!.id);
  const [optionChosen, setOptionChosen] = useState(false);
  const [answer, setAnswer] = useState<MeasuringAnswer | null>(null);

  const model = useMemo(
    () => ({
      distanceUnit: DISTANCE_UNIT,
      optionChosen,
      measureFrom,
      usesAllPlacesInArea: false,
      usedMeasuringFromKinds: EMPTY_USED,
      subject: subjectFor(measureFrom),
      targetMode: "nearest" as const,
      anchorAltitudeMeters: null,
      hasSeekerPoint: optionChosen,
      hasTargetPoint: optionChosen,
      seekerPlaceName: optionChosen ? "Your pin" : null,
      targetPlaceName: optionChosen ? "Demo Landmark" : null,
      distanceMeters: optionChosen ? 850 : null,
      loading: false,
      gpsLoading: false,
      searchQuery: "",
      searchResults: [],
      searchLoading: false,
      searchRole: "target" as const,
      answer,
      costLabel: "D3P1",
      awaitHiderAnswer: false,
      onMeasureFromChange: (kind: MeasuringFromKind) => {
        setMeasureFrom(kind);
        setOptionChosen(true);
        setAnswer(null);
      },
      onTargetModeChange: () => {},
      onSearchQueryChange: () => {},
      onSearchSubmit: () => {},
      onSearchResultSelect: () => {},
      onUseGps: () => {},
      onFindCoastline: () => {},
      onRetrySeaLevel: () => {},
      onFindLinearFeature: () => {},
      onFindNearest: () => {},
      onAnswerChange: setAnswer,
    }),
    [answer, measureFrom, optionChosen],
  );

  return <MeasuringHudBody model={model} />;
}
