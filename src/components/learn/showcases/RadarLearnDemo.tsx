import { useState } from "react";
import { RadarHudBody } from "@/components/tools/ask/radar/RadarHudBody";
import type { DistanceUnit } from "@/domain/map/distance";
import { parseDistanceInput } from "@/domain/map/distance";
import type { RadarAnswer, RadarDistanceOptionKey } from "@/domain/questions";
import type { GameSize } from "@/domain/session/size/gameSize";

const EMPTY_USED = new Set<RadarDistanceOptionKey>();
const GAME_SIZE: GameSize = "medium";
const DISTANCE_UNIT: DistanceUnit = "metric";

/** Live Radar Ask HUD with local state (no session / map). */
export function RadarLearnDemo() {
  const [radiusMeters, setRadiusMeters] = useState<number | null>(null);
  const [chooseCustom, setChooseCustom] = useState(false);
  const [customRadius, setCustomRadius] = useState("");
  const [editingDistance, setEditingDistance] = useState(true);
  const [hasCenter, setHasCenter] = useState(false);
  const [answer, setAnswer] = useState<RadarAnswer | null>(null);

  const placeCenter = () => {
    setHasCenter(true);
    setEditingDistance(false);
  };

  return (
    <RadarHudBody
      radiusMeters={radiusMeters}
      chooseCustom={chooseCustom}
      customRadius={customRadius}
      awaitingPlacement={!hasCenter}
      hasCenter={hasCenter}
      distanceUnit={DISTANCE_UNIT}
      gameSize={GAME_SIZE}
      usedDistanceOptions={EMPTY_USED}
      answer={answer}
      editingDistance={editingDistance}
      costLabel="D2P1"
      awaitHiderAnswer={false}
      gpsLoading={false}
      onPresetSelect={(meters) => {
        setRadiusMeters(meters);
        setChooseCustom(false);
        setAnswer(null);
        placeCenter();
      }}
      onChooseSelect={() => {
        setChooseCustom(true);
        setEditingDistance(true);
      }}
      onCustomRadiusChange={setCustomRadius}
      onCustomDistanceCommit={() => {
        const parsed = parseDistanceInput(customRadius, DISTANCE_UNIT);
        if (parsed == null) return;
        setRadiusMeters(parsed);
        setChooseCustom(true);
        setAnswer(null);
        placeCenter();
      }}
      onAnswerChange={setAnswer}
      onUseGps={placeCenter}
      onPlaceAtMapTap={placeCenter}
    />
  );
}
