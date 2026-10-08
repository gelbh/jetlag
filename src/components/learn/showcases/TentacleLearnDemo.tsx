import { useState } from "react";
import { TentacleHudBody } from "@/components/tools/ask/tentacle/TentacleHudBody";
import type { TentaclePoi } from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import { METRIC_TENTACLE_MEDIUM_RADIUS_METERS } from "@/domain/map/distancePresets";
import type { TentacleExtendedCategoryId } from "@/domain/questions";
import type { GameSize } from "@/domain/session/size/gameSize";

const GAME_SIZE: GameSize = "medium";
const DISTANCE_UNIT: DistanceUnit = "metric";
const EMPTY_USED = new Set<TentacleExtendedCategoryId>();
const RADIUS = METRIC_TENTACLE_MEDIUM_RADIUS_METERS;

function demoPois(category: TentacleExtendedCategoryId): TentaclePoi[] {
  return [
    {
      id: "demo-a",
      name: "North Place",
      lat: 0,
      lng: 0,
      category,
    },
    {
      id: "demo-b",
      name: "South Place",
      lat: 0.01,
      lng: 0,
      category,
    },
    {
      id: "demo-c",
      name: "East Place",
      lat: 0,
      lng: 0.01,
      category,
    },
  ];
}

/** Live Tentacles catalog with canned nearby places for the answer picker. */
export function TentacleLearnDemo() {
  const [categoryId, setCategoryId] = useState<TentacleExtendedCategoryId | null>(null);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [outOfReach, setOutOfReach] = useState(false);
  const pois = categoryId ? demoPois(categoryId) : [];

  return (
    <TentacleHudBody
      gameSize={GAME_SIZE}
      categoryId={categoryId}
      categoryChosen={categoryChosen}
      searchRadiusMeters={RADIUS}
      usedCategoryIds={EMPTY_USED}
      distanceUnit={DISTANCE_UNIT}
      poiOptions={pois}
      selectedPoiId={selectedPoiId}
      outOfReach={outOfReach}
      loading={false}
      awaitingPlacement={false}
      hasCenter={categoryChosen}
      gpsLoading={false}
      costLabel="D4P2"
      awaitHiderAnswer={false}
      onCategoryChange={(id) => {
        setCategoryId(id);
        setCategoryChosen(true);
        setSelectedPoiId(null);
        setOutOfReach(false);
      }}
      onUseGps={() => {}}
      onPlaceAtMapTap={() => {}}
      onSelectPoi={setSelectedPoiId}
      onOutOfReachChange={setOutOfReach}
    />
  );
}
