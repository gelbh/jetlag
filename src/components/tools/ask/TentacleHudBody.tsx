/**
 * Tentacle Ask HUD mode body — CatalogRail → map radius (+ locations / solo answer).
 * Matching-style question header + catalog; map-first overlays after category.
 * SingleBottomChord: row tap advances; no PhaseRail / CONTINUE.
 */
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { TentacleLocationsChord } from "@/components/tools/ask/TentacleLocationsChord";
import { HudTentacleIcon } from "@/components/map/icons/ToolIcons";
import { TentacleAnswerPicker } from "@/components/tools/shared/answers/TentacleAnswerPicker";
import { AnchorControls } from "@/components/tools/shared/controls/AnchorControls";
import { QuestionPromptBlock } from "@/components/tools/shared/controls/QuestionPromptBlock";
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";
import { LoadingReadout } from "@/components/tools/shared/readout/LoadingReadout";
import { ResolvedReadout } from "@/components/tools/shared/readout/ResolvedReadout";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import { iosAskInsetSurfaceStyle } from "@/components/ui/apple/iosEntryChrome";
import type { TentaclePoi } from "@/domain/map/annotations";
import {
  formatDistance,
  formatPresetDistance,
  type DistanceUnit,
} from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import {
  tentacleCategoriesForGameSize,
  tentacleQuestionPrompt,
  type TentacleExtendedCategoryId,
} from "@/domain/questions";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

const TENTACLE_QUESTION_INTRO_RULE =
  "Pick a location type below. Search radius is fixed for this game size.";

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
  costLabel?: string | null;
  toolLabel?: string;
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
  costLabel = null,
  toolLabel = "Tentacle",
}: TentacleHudBodyProps) {
  const mantinePlayerUi = usePlayerUiMantine();
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

  const distanceLabel = formatDistance(searchRadiusMeters, distanceUnit);
  const question =
    categoryId != null
      ? {
          prompt: tentacleQuestionPrompt(
            categoryId,
            distanceUnit,
            searchRadiusMeters,
          ),
          ruleSummary: TENTACLE_QUESTION_INTRO_RULE,
        }
      : {
          prompt: `Within ${distanceLabel} of me, which [type] are you nearest to? (You must also be within ${distanceLabel})`,
          ruleSummary: TENTACLE_QUESTION_INTRO_RULE,
        };

  const chord: "types" | "place" | "locations" = !categoryChosen
    ? "types"
    : !hasCenter
      ? "place"
      : "locations";

  return (
    <div
      data-testid="tentacle-hud-body"
      className="ask-hud-mode-body flex w-full flex-col gap-2"
    >
      <div
        className={
          mantinePlayerUi
            ? "pointer-events-auto space-y-2 p-3"
            : "pointer-events-auto ask-hud-panel space-y-2 p-3"
        }
        style={mantinePlayerUi ? iosAskInsetSurfaceStyle : undefined}
        {...(mantinePlayerUi ? { "data-player-ux-world": "mantine" } : {})}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex shrink-0 flex-col items-center gap-1"
            style={{ minWidth: 44 }}
          >
            <span
              aria-hidden
              className="inline-flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor:
                  "oklch(from var(--color-field-ink) l c h / 0.08)",
                color: "var(--color-field-ink)",
              }}
            >
              <HudTentacleIcon width={22} height={22} />
            </span>
            {costLabel ? (
              <span
                data-testid="ask-cost-chip"
                role="status"
                aria-label={`${toolLabel} · ${costLabel}`}
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 650,
                  letterSpacing: "0.02em",
                  color: "var(--color-field-ink-muted)",
                  lineHeight: 1,
                }}
              >
                {costLabel}
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="m-0 mb-0.5 text-xs font-semibold leading-none"
              style={{
                color: "var(--color-field-ink-muted)",
                letterSpacing: "0.02em",
              }}
            >
              {toolLabel}
            </p>
            <QuestionPromptBlock
              prompt={question.prompt}
              ruleSummary={question.ruleSummary}
            />
          </div>
        </div>
      </div>

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
        <div className="pointer-events-auto ask-hud-panel space-y-2 p-3">
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
        <TentacleLocationsChord
          header={
            <>
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
                  {poiOptions.length} location
                  {poiOptions.length === 1 ? "" : "s"} found within{" "}
                  {searchRadiusLabel}.
                </ResolvedReadout>
              ) : (
                <ResolvedReadout variant="warning">
                  No named locations were found within {searchRadiusLabel}.
                </ResolvedReadout>
              )}
              {error ? <AskInlineError message={error} /> : null}
            </>
          }
        >
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
        </TentacleLocationsChord>
      ) : null}
    </div>
  );
}
