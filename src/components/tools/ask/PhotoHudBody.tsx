/**
 * Photo Ask HUD mode body — chip island (or short CatalogRail) for category.
 * Commit lives on PrimedCommitStrip only.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { AskChipIsland } from "@/components/tools/ask/AskChipIsland";
import { CatalogExhaustedMessage } from "@/components/tools/shared/readout/CatalogExhaustedMessage";
import { QuestionPromptBlock } from "@/components/tools/shared/controls/QuestionPromptBlock";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
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

export type PhotoHudBodyProps = {
  gameSize: GameSize;
  distanceUnit?: DistanceUnit;
  categoryId: PhotoCategoryId;
  usedCategoryIds: ReadonlySet<PhotoCategoryId>;
  onCategoryChange: (categoryId: PhotoCategoryId) => void;
  hasOpenQuestion?: boolean;
  awaitHiderAnswer?: boolean;
};

export function PhotoHudBody({
  gameSize,
  distanceUnit = "imperial",
  categoryId,
  usedCategoryIds,
  onCategoryChange,
  hasOpenQuestion = false,
  awaitHiderAnswer = false,
}: PhotoHudBodyProps) {
  const availableCategories = photoCategoriesForGameSize(gameSize).filter(
    (category) => !usedCategoryIds.has(category.id),
  );
  const question = photoQuestionFor(categoryId, distanceUnit);
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
          selectedId={categoryReady ? categoryId : null}
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
            selectedId={categoryReady ? categoryId : null}
            onSelect={(id) => onCategoryChange(id as PhotoCategoryId)}
            aria-label="Photo question"
          />
        </div>
      )}
      {categoryReady ? (
        <div className="pointer-events-auto ask-hud-panel space-y-2 p-3">
          <QuestionPromptBlock
            prompt={question.prompt}
            ruleSummary={question.ruleSummary}
          />
          {hasOpenQuestion ? (
            <p className="text-sm text-halt">
              Finish the open question before starting another.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
