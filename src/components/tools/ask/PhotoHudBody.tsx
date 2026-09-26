/**
 * Photo Ask HUD mode body — Matching twin: question header + catalog/chips.
 * Map-first overlay owns Send after category is chosen (Mantine flag).
 */
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { AskChipIsland } from "@/components/tools/ask/AskChipIsland";
import { HudPhotoIcon } from "@/components/map/icons/ToolIcons";
import { CatalogExhaustedMessage } from "@/components/tools/shared/readout/CatalogExhaustedMessage";
import { QuestionPromptBlock } from "@/components/tools/shared/controls/QuestionPromptBlock";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import { askInsetSurfaceStyle } from "@/components/ui/entry/entryChrome";
import type { DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import {
  isPhotoCategoryAvailableForGameSize,
  photoCategoriesForGameSize,
  photoCategoryLabelForUnit,
  photoQuestionFor,
  type PhotoCategoryId,
} from "@/domain/questions";
/** Prefer chips when few options; short rail when the catalog is longer. */
const CHIP_ISLAND_MAX = 6;

const PHOTO_QUESTION_INTRO = {
  prompt: "Send me a photo of [subject].",
  ruleSummary: "Pick a photo ask below. Hiders reply with a photo in chat.",
};

export type PhotoHudBodyProps = {
  gameSize: GameSize;
  distanceUnit?: DistanceUnit;
  categoryId: PhotoCategoryId;
  categoryChosen?: boolean;
  usedCategoryIds: ReadonlySet<PhotoCategoryId>;
  onCategoryChange: (categoryId: PhotoCategoryId) => void;
  hasOpenQuestion?: boolean;
  awaitHiderAnswer?: boolean;
  costLabel?: string | null;
  toolLabel?: string;
};

export function PhotoHudBody({
  gameSize,
  distanceUnit = "imperial",
  categoryId,
  categoryChosen = false,
  usedCategoryIds,
  onCategoryChange,
  hasOpenQuestion = false,
  awaitHiderAnswer = false,
  costLabel = null,
  toolLabel = "Photo",
}: PhotoHudBodyProps) {
  const availableCategories = photoCategoriesForGameSize(gameSize).filter(
    (category) => !usedCategoryIds.has(category.id),
  );
  /** Flag-off keeps prior always-selected catalog; Mantine waits for an explicit tap. */
  const showAsChosen = categoryChosen || !true;
  const question = showAsChosen
    ? photoQuestionFor(categoryId, distanceUnit)
    : PHOTO_QUESTION_INTRO;
  const categoryReady =
    availableCategories.length > 0 &&
    isPhotoCategoryAvailableForGameSize(gameSize, categoryId) &&
    !usedCategoryIds.has(categoryId);

  const useRail = availableCategories.length > CHIP_ISLAND_MAX;

  return (
    <div
      data-testid="photo-hud-body"
      className="ask-hud-mode-body flex w-full flex-col gap-2"
    >
      <div
        className="pointer-events-auto space-y-2 p-3"
        style={askInsetSurfaceStyle}
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
              <HudPhotoIcon width={22} height={22} />
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

      {!showAsChosen ? (
        <div className="space-y-2">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
          {availableCategories.length === 0 ? (
            <div className="pointer-events-auto ask-hud-panel p-3">
              <CatalogExhaustedMessage message="Every photo question has already been used this session." />
            </div>
          ) : useRail ? (
            <AskCatalogRail
              rows={availableCategories.map((category) => ({
                id: category.id,
                label: photoCategoryLabelForUnit(category.id, distanceUnit),
              }))}
              selectedId={categoryReady && showAsChosen ? categoryId : null}
              onSelect={(id) => onCategoryChange(id as PhotoCategoryId)}
              aria-label="Photo question"
              hint="Tap a row to pick a photo ask"
            />
          ) : (
            <div className="pointer-events-auto space-y-2">
              <AskChipIsland
                chips={availableCategories.map((category) => ({
                  id: category.id,
                  label: photoCategoryLabelForUnit(category.id, distanceUnit),
                }))}
                selectedId={categoryReady && showAsChosen ? categoryId : null}
                onSelect={(id) => onCategoryChange(id as PhotoCategoryId)}
                aria-label="Photo question"
              />
            </div>
          )}
          {hasOpenQuestion ? (
            <p className="pointer-events-auto text-sm text-halt">
              Finish the open question before starting another.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
