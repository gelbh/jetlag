import {
  clampHidingPeriodMinutes,
  clampPhotoAnswerDeadlineMinutes,
  clampQuestionAnswerDeadlineMinutes,
  HIDING_PERIOD_MINUTES_MAX,
  HIDING_PERIOD_MINUTES_MIN,
  HIDING_PERIOD_PRESET_MINUTES,
  PHOTO_ANSWER_DEADLINE_MINUTES_MAX,
  PHOTO_ANSWER_DEADLINE_MINUTES_MIN,
  PHOTO_ANSWER_DEADLINE_PRESET_MINUTES,
  QUESTION_ANSWER_DEADLINE_MINUTES_MAX,
  QUESTION_ANSWER_DEADLINE_MINUTES_MIN,
  QUESTION_ANSWER_DEADLINE_PRESET_MINUTES,
} from "../../../domain/session/sessionRules";
import { PresetButton } from "./shared";
import type { AdvancedSettingsSectionProps } from "./types";

export function DeadlinesSection({
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Timers
      </p>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={value.customHidingPeriodEnabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              customHidingPeriodEnabled: event.target.checked,
            })
          }
          className="mt-1"
        />
        <span>
          <span className="block font-medium">Custom hiding period</span>
          <span className="mt-0.5 block text-xs text-ink-muted">
            Minutes the hider has before seekers start ({HIDING_PERIOD_MINUTES_MIN}–
            {HIDING_PERIOD_MINUTES_MAX}).
          </span>
        </span>
      </label>

      {value.customHidingPeriodEnabled ? (
        <div className="space-y-2">
          <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
            Hiding period (minutes)
            <input
              type="number"
              min={HIDING_PERIOD_MINUTES_MIN}
              max={HIDING_PERIOD_MINUTES_MAX}
              value={value.hidingPeriodMinutes}
              disabled={disabled}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onChange({
                  ...value,
                  hidingPeriodMinutes: clampHidingPeriodMinutes(parsed),
                });
              }}
              className="field-input mt-2"
              inputMode="numeric"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {HIDING_PERIOD_PRESET_MINUTES.map((minutes) => (
              <PresetButton
                key={minutes}
                label={`${minutes} min`}
                disabled={disabled}
                onClick={() => onChange({ ...value, hidingPeriodMinutes: minutes })}
              />
            ))}
          </div>
        </div>
      ) : null}

      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={value.customPhotoAnswerDeadlineEnabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              customPhotoAnswerDeadlineEnabled: event.target.checked,
            })
          }
          className="mt-1"
        />
        <span>
          <span className="block font-medium">Custom photo answer deadline</span>
        </span>
      </label>

      {value.customPhotoAnswerDeadlineEnabled ? (
        <div className="space-y-2">
          <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
            Photo deadline (minutes)
            <input
              type="number"
              min={PHOTO_ANSWER_DEADLINE_MINUTES_MIN}
              max={PHOTO_ANSWER_DEADLINE_MINUTES_MAX}
              value={value.photoAnswerDeadlineMinutes}
              disabled={disabled}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onChange({
                  ...value,
                  photoAnswerDeadlineMinutes:
                    clampPhotoAnswerDeadlineMinutes(parsed),
                });
              }}
              className="field-input mt-2"
              inputMode="numeric"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {PHOTO_ANSWER_DEADLINE_PRESET_MINUTES.map((minutes) => (
              <PresetButton
                key={minutes}
                label={`${minutes} min`}
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    photoAnswerDeadlineMinutes: minutes,
                  })
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={value.customQuestionAnswerDeadlineEnabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              customQuestionAnswerDeadlineEnabled: event.target.checked,
            })
          }
          className="mt-1"
        />
        <span>
          <span className="block font-medium">Custom question answer deadline</span>
        </span>
      </label>

      {value.customQuestionAnswerDeadlineEnabled ? (
        <div className="space-y-2">
          <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
            Question deadline (minutes)
            <input
              type="number"
              min={QUESTION_ANSWER_DEADLINE_MINUTES_MIN}
              max={QUESTION_ANSWER_DEADLINE_MINUTES_MAX}
              value={value.questionAnswerDeadlineMinutes}
              disabled={disabled}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onChange({
                  ...value,
                  questionAnswerDeadlineMinutes:
                    clampQuestionAnswerDeadlineMinutes(parsed),
                });
              }}
              className="field-input mt-2"
              inputMode="numeric"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_ANSWER_DEADLINE_PRESET_MINUTES.map((minutes) => (
              <PresetButton
                key={minutes}
                label={`${minutes} min`}
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    questionAnswerDeadlineMinutes: minutes,
                  })
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
