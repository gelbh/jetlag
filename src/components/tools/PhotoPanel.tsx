import {
  isPhotoCategoryAvailableForGameSize,
  photoCategoriesForGameSize,
  photoQuestionFor,
  type PhotoCategoryId,
} from "../../domain/questions/photoQuestions";
import type { GameSize } from "../../domain/session/gameSize";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";

interface PhotoPanelProps {
  gameSize: GameSize;
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
  const availableCategories = photoCategoriesForGameSize(gameSize).filter(
    (category) => !usedCategoryIds.has(category.id),
  );
  const question = photoQuestionFor(categoryId);
  const canCommit =
    canSubmitQuestion &&
    availableCategories.length > 0 &&
    isPhotoCategoryAvailableForGameSize(gameSize, categoryId) &&
    !usedCategoryIds.has(categoryId) &&
    !isSubmitting;
  const displayError =
    error &&
    !(
      hasOpenQuestion === false &&
      error === "Finish the open question before starting another."
    )
      ? error
      : null;

  return (
    <ToolPanelShell toolId="photo">
      <ToolSection first compact status="active">
        {availableCategories.length === 0 ? (
          <p className="text-sm text-status-warning">
            Every photo question has already been used this session.
          </p>
        ) : (
          <label className="field-label">
            Photo question
            <select
              value={categoryId}
              onChange={(event) =>
                onCategoryChange(event.target.value as PhotoCategoryId)
              }
              className="field-input"
            >
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <QuestionPromptBlock
          prompt={question.prompt}
          ruleSummary={question.ruleSummary}
        />
        <p className="text-xs text-ink-dim">
          Hiders upload a photo or reply that they cannot answer in game chat.
        </p>
        {hasOpenQuestion ? (
          <p className="text-sm text-status-warning">
            Finish the open question before starting another.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onCommit}
          disabled={!canCommit}
          aria-busy={isSubmitting}
          className="btn-primary min-h-12 w-full disabled:opacity-40"
        >
          {isSubmitting ? "Sending…" : `Send to hiders (${costLabel})`}
        </button>
        {displayError ? (
          <p className="text-sm text-status-error">{displayError}</p>
        ) : null}
      </ToolSection>
    </ToolPanelShell>
  );
}
