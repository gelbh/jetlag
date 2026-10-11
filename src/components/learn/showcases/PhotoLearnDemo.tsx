import { useState } from "react";
import { PhotoHudBody } from "@/components/tools/ask/photo/PhotoHudBody";
import type { DistanceUnit } from "@/domain/map/distance";
import { type PhotoCategoryId, photoCategoriesForGameSize } from "@/domain/questions";
import type { GameSize } from "@/domain/session/size/gameSize";

const GAME_SIZE: GameSize = "medium";
const DISTANCE_UNIT: DistanceUnit = "metric";
const EMPTY_USED = new Set<PhotoCategoryId>();
const DEFAULT_CATEGORY = photoCategoriesForGameSize(GAME_SIZE)[0]!.id;

/** Live Photo Ask catalog. */
export function PhotoLearnDemo() {
  const [categoryId, setCategoryId] = useState<PhotoCategoryId>(DEFAULT_CATEGORY);
  const [categoryChosen, setCategoryChosen] = useState(false);

  return (
    <PhotoHudBody
      gameSize={GAME_SIZE}
      distanceUnit={DISTANCE_UNIT}
      categoryId={categoryId}
      categoryChosen={categoryChosen}
      usedCategoryIds={EMPTY_USED}
      costLabel="D1P1"
      awaitHiderAnswer={false}
      onCategoryChange={(id) => {
        setCategoryId(id);
        setCategoryChosen(true);
      }}
    />
  );
}
