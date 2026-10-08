import { useState } from "react";
import { MatchingHudBody } from "@/components/tools/ask/matching/MatchingHudBody";
import type { DistanceUnit } from "@/domain/map/distance";
import type { MatchingAnswer, MatchingCategoryId } from "@/domain/questions";

const EMPTY_USED = new Set<MatchingCategoryId>();
const DISTANCE_UNIT: DistanceUnit = "metric";

/** Live Matching category catalog with a canned nearest-feature resolve. */
export function MatchingLearnDemo() {
  const [categoryId, setCategoryId] = useState<MatchingCategoryId | null>(null);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [answer, setAnswer] = useState<MatchingAnswer | null>(null);

  return (
    <MatchingHudBody
      distanceUnit={DISTANCE_UNIT}
      categoryId={categoryId}
      categoryChosen={categoryChosen}
      usedCategoryIds={EMPTY_USED}
      hasSeekerPoint={categoryChosen}
      usesContainmentMatching={false}
      nearestFeatureName={categoryChosen ? "Demo Station" : null}
      distanceMeters={categoryChosen ? 420 : null}
      featureCount={categoryChosen ? 12 : null}
      inPlayAreaFeatureCount={categoryChosen ? 8 : null}
      nearestOutsidePlayArea={false}
      nullAnswer={false}
      loading={false}
      gpsLoading={false}
      answer={answer}
      costLabel="D3P1"
      awaitHiderAnswer={false}
      onCategoryChange={(id) => {
        setCategoryId(id);
        setCategoryChosen(true);
        setAnswer(null);
      }}
      onUseGps={() => {}}
      onAnswerChange={setAnswer}
    />
  );
}
