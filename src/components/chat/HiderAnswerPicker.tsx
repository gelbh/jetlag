import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type { GameReplyOption } from "../../domain/session/activity/sessionChat";
import {
  hiderTruthReferenceLabel,
  hiderTruthReferenceLoadingLabel,
} from "../tools/shared/questionTruthReferenceHint";
import { LoadingReadout } from "../tools/shared/readout/LoadingReadout";

interface HiderAnswerPickerProps {
  replyOptions: readonly GameReplyOption[];
  truth: HiderTruthResult | null;
  loading: boolean;
  truthReferenceMode: HiderTruthReferenceMode;
  onSelect: (option: GameReplyOption) => void;
}

function sendAnswerLabel(optionLabel: string): string {
  return `Send answer: ${optionLabel}`;
}

export function HiderAnswerPicker({
  replyOptions,
  truth,
  loading,
  truthReferenceMode,
  onSelect,
}: HiderAnswerPickerProps) {
  const truthAvailable =
    truth !== null && !truth.unavailable && truth.replyId.length > 0;
  const gridClass =
    replyOptions.length > 2 ? "grid-cols-1" : "grid-cols-2";
  const referenceLabel = hiderTruthReferenceLabel(truthReferenceMode);

  return (
    <div className="mt-3 space-y-2">
      {loading ? (
        <LoadingReadout>
          {hiderTruthReferenceLoadingLabel(truthReferenceMode)}
        </LoadingReadout>
      ) : truth?.unavailable ? (
        <p className="text-xs text-status-warning">{truth.label}</p>
      ) : truthAvailable ? (
        <p className="text-xs text-ink-secondary">
          <span className="font-semibold uppercase tracking-wide text-brand-blue">
            {referenceLabel}
          </span>
          <span className="mx-1.5 text-ink-dim">·</span>
          <span className="text-ink">{truth.label}</span>
        </p>
      ) : null}

      <div className={`grid gap-2 ${gridClass}`}>
        {replyOptions.map((option) => {
          const isRecommended = truthAvailable && option.id === truth.replyId;
          const buttonLabel = sendAnswerLabel(option.label);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option)}
              aria-label={
                isRecommended
                  ? `${buttonLabel} (recommended ${referenceLabel.toLowerCase()})`
                  : buttonLabel
              }
              className={
                isRecommended
                  ? "btn-primary min-h-11"
                  : "btn-secondary min-h-11"
              }
            >
              {buttonLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
