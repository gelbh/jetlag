/**
 * Tentacle Ask HUD mode body — CatalogRail → map radius (+ locations / solo answer).
 * SingleBottomChord: row tap advances; no PhaseRail / CONTINUE.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { TentacleAnswerPicker } from "@/components/tools/shared/answers/TentacleAnswerPicker";
import { AnchorControls } from "@/components/tools/shared/controls/AnchorControls";
import { LoadingReadout } from "@/components/tools/shared/readout/LoadingReadout";
import { ResolvedReadout } from "@/components/tools/shared/readout/ResolvedReadout";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import type { TentaclePoi } from "@/domain/map/annotations";
import { formatPresetDistance, type DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import {
  tentacleCategoriesForGameSize,
  type TentacleExtendedCategoryId,
} from "@/domain/questions";

export type TentacleHudBodyProps = {
  gameSize: GameSize;
  categoryId: TentacleExtendedCategoryId | null;
  categoryChosen: boolean;
  searchRadiusMeters: number;
  usedCategoryIds: ReadonlySet<TentacleExtendedCategoryId>;
  distanceUnit: DistanceUnit;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  loading: boolean;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  gpsLoading?: boolean;
  error?: string | null;
  onCategoryChange: (categoryId: TentacleExtendedCategoryId) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  onSelectPoi: (poiId: string) => void;
  onOutOfReachChange: (outOfReach: boolean) => void;
  awaitHiderAnswer?: boolean;
};

export function TentacleHudBody({
  gameSize,
  categoryId,
  categoryChosen,
  searchRadiusMeters,
  usedCategoryIds,
  distanceUnit,
  poiOptions,
  selectedPoiId,
  outOfReach,
  loading,
  awaitingPlacement,
  hasCenter,
  gpsLoading = false,
  error = null,
  onCategoryChange,
  onUseGps,
  onPlaceAtMapTap,
  onSelectPoi,
  onOutOfReachChange,
  awaitHiderAnswer = false,
}: TentacleHudBodyProps) {
  const availableCategories = tentacleCategoriesForGameSize(gameSize).filter(
    (category) =>
      !usedCategoryIds.has(category.id) || category.id === categoryId,
  );

  const catalogRows = availableCategories.map((category) => ({
    id: category.id,
    label: category.label,
  }));

  const searchRadiusLabel =
    categoryId !== null
      ? formatPresetDistance(searchRadiusMeters, distanceUnit)
      : null;

  let chord: "types" | "place" | "locations" = "types";
  if (!categoryChosen) {
    chord = "types";
  } else if (!hasCenter) {
    chord = "place";
  } else {
    chord = "locations";
  }

  return (
    <div
      data-testid="tentacle-hud-body"
      className="ask-hud-mode-body mx-auto flex max-w-xl flex-col gap-2"
    >
      {chord === "types" ? (
        <div className="space-y-2">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
          <AskCatalogRail
            rows={catalogRows}
            selectedId={categoryChosen ? categoryId : null}
            onSelect={(id) =>
              onCategoryChange(id as TentacleExtendedCategoryId)
            }
            aria-label="Location type"
            hint="Tap a row to set location types"
          />
        </div>
      ) : null}

      {chord === "place" ? (
        <div className="pointer-events-auto hud-panel space-y-2 p-3">
          <AnchorControls
            awaitingPlacement={awaitingPlacement}
            hasAnchor={hasCenter}
            gpsLoading={gpsLoading}
            onUseGps={onUseGps}
            onPlaceAtMapTap={onPlaceAtMapTap}
            anchorHint="Anchor pinned on the map. Tap again to move it."
            gpsLoadingLabel="Locating…"
          />
          {searchRadiusLabel ? (
            <ResolvedReadout variant="dim">
              Search radius is fixed at {searchRadiusLabel} from your anchor.
            </ResolvedReadout>
          ) : null}
        </div>
      ) : null}

      {chord === "locations" ? (
        <div className="pointer-events-auto hud-panel space-y-2 p-3">
          <AnchorControls
            awaitingPlacement={awaitingPlacement}
            hasAnchor={hasCenter}
            gpsLoading={gpsLoading}
            onUseGps={onUseGps}
            onPlaceAtMapTap={onPlaceAtMapTap}
            anchorHint="Anchor pinned on the map. Tap again to move it."
            gpsLoadingLabel="Locating…"
          />
          {loading ? (
            <LoadingReadout>
              {poiOptions.length > 0
                ? `Confirming ${poiOptions.length} map preview${
                    poiOptions.length === 1 ? "" : "s"
                  }…`
                : `Loading locations within ${searchRadiusLabel}…`}
            </LoadingReadout>
          ) : poiOptions.length > 0 ? (
            <ResolvedReadout>
              {poiOptions.length} location{poiOptions.length === 1 ? "" : "s"}{" "}
              found within {searchRadiusLabel}.
            </ResolvedReadout>
          ) : (
            <ResolvedReadout variant="warning">
              No named locations were found within {searchRadiusLabel}.
            </ResolvedReadout>
          )}
          {!awaitHiderAnswer && categoryId && poiOptions.length > 0 ? (
            <TentacleAnswerPicker
              categoryId={categoryId}
              distanceUnit={distanceUnit}
              searchRadiusMeters={searchRadiusMeters}
              poiOptions={poiOptions}
              selectedPoiId={selectedPoiId}
              outOfReach={outOfReach}
              onSelectPoi={onSelectPoi}
              onOutOfReachChange={onOutOfReachChange}
            />
          ) : null}
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
