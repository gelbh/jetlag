import type { DistanceUnit } from "../../domain/map/distance";
import {
  isPhotoCategoryAvailableForGameSize,
  type PhotoCategoryId,
  photoCategoriesForGameSize,
  photoCategoryLabelForUnit,
  photoQuestionFor,
} from "../../domain/questions";
import type { GameSize } from "../../domain/session/size/gameSize";
import { QuestionPromptBlock } from "./shared/controls/QuestionPromptBlock";
import { SendToHidersButton } from "./shared/controls/SendToHidersButton";
import { ToolPanelShell } from "./shared/panels/ToolPanelShell";
import { ToolSection } from "./shared/panels/ToolSection";
import { QuestionTruthReferenceHint } from "./shared/QuestionTruthReferenceHint";
import { CatalogExhaustedMessage } from "./shared/readout/CatalogExhaustedMessage";

interface PhotoPanelProps {
  gameSize: GameSize;
  distanceUnit?: DistanceUnit;
  categoryId: PhotoCategoryId;
  usedCategoryIds: ReadonlySet<PhotoCategoryId>;
  costLabel: string;
  onCategoryChange: (categoryId: PhotoCategoryId) => void;
  onCommit: () => void;
  error?: string | null;
  isSubmitting?: boolean;
  canSubmitQuestion?: boolean;
  hasOpenQuestion?: boolean;
}

export function PhotoPanel({
  gameSize,
  distanceUnit = "imperial",
  categoryId,
  usedCategoryIds,
  costLabel,
  onCategoryChange,
  onCommit,
  error,
  isSubmitting = false,
  canSubmitQuestion = true,
  hasOpenQuestion = false,
}: PhotoPanelProps) {
  const catalogCategories = photoCategoriesForGameSize(gameSize);
  const availableCategories = catalogCategories.filter(
    (category) => !usedCategoryIds.has(category.id),
  );
  const question = photoQuestionFor(categoryId, distanceUnit);
  const canCommit =
    canSubmitQuestion &&
    availableCategories.length > 0 &&
    isPhotoCategoryAvailableForGameSize(gameSize, categoryId) &&
    !usedCategoryIds.has(categoryId) &&
    !isSubmitting;
  const displayError =
    error &&
    !(hasOpenQuestion === false && error === "Finish the open question before starting another.")
      ? error
      : null;

  return (
    <ToolPanelShell toolId="photo">
      <ToolSection first compact status="active">
        {availableCategories.length === 0 ? (
          <CatalogExhaustedMessage message="Every photo question has already been used this session." />
        ) : null}
        <label className="field-label">
          Photo question
          <select
            value={usedCategoryIds.has(categoryId) ? "" : categoryId}
            onChange={(event) => onCategoryChange(event.target.value as PhotoCategoryId)}
            className="field-input"
            disabled={availableCategories.length === 0}
          >
            {catalogCategories.map((category) => (
              <option
                key={category.id}
                value={category.id}
                disabled={usedCategoryIds.has(category.id)}
              >
                {photoCategoryLabelForUnit(category.id, distanceUnit)}
              </option>
            ))}
          </select>
        </label>
        <QuestionPromptBlock prompt={question.prompt} ruleSummary={question.ruleSummary} />
        <QuestionTruthReferenceHint />
        <SendToHidersButton
          costLabel={costLabel}
          isSubmitting={isSubmitting}
          disabled={!canCommit}
          onClick={onCommit}
          instruction="Hiders upload a photo or reply that they cannot answer in game chat."
          warning={
            hasOpenQuestion ? "Finish the open question before starting another." : undefined
          }
          error={displayError}
        />
      </ToolSection>
    </ToolPanelShell>
  );
}
