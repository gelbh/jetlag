import { useState } from "react";
import { ThermometerHudBody } from "@/components/tools/ask/thermometer/ThermometerHudBody";
import type { DistanceUnit } from "@/domain/map/distance";
import { LEARN_DEMO_SESSION_RULES } from "./demoSessionRules";

const DISTANCE_UNIT: DistanceUnit = "metric";

/** Live Thermometer distance catalog (walk / answer live on the map in play). */
export function ThermometerLearnDemo() {
  const [distanceMeters, setDistanceMeters] = useState(0);

  return (
    <ThermometerHudBody
      distanceUnit={DISTANCE_UNIT}
      sessionRules={LEARN_DEMO_SESSION_RULES}
      distanceMeters={distanceMeters}
      travelMeters={null}
      answer={null}
      step="a"
      placementMode="manual"
      walkingActive={false}
      presetUseCount={0}
      costLabel="D2P1"
      gpsLoading={false}
      canSubmitQuestion
      isSubmitting={false}
      onPlacementModeChange={() => {}}
      onDistanceChange={setDistanceMeters}
      onAnswerChange={() => {}}
      onReset={() => setDistanceMeters(0)}
      onStartWalk={() => {}}
      awaitHiderAnswer={false}
    />
  );
}
