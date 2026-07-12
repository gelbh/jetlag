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
import {
  AdvancedSettingsSectionHeader,
  ToggleNumberWithPresets,
} from "./shared";
import type { AdvancedSettingsSectionProps } from "./types";

export function DeadlinesSection({
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <AdvancedSettingsSectionHeader title="Timers" />

      <ToggleNumberWithPresets
        enabled={value.customHidingPeriodEnabled}
        onEnabledChange={(customHidingPeriodEnabled) =>
          onChange({ ...value, customHidingPeriodEnabled })
        }
        disabled={disabled}
        toggleLabel="Custom hiding period"
        toggleDescription={`Minutes the hider has before seekers start (${HIDING_PERIOD_MINUTES_MIN}–${HIDING_PERIOD_MINUTES_MAX}).`}
        numberLabel="Hiding period (minutes)"
        numberValue={value.hidingPeriodMinutes}
        onNumberChange={(parsed) =>
          onChange({
            ...value,
            hidingPeriodMinutes: clampHidingPeriodMinutes(parsed),
          })
        }
        min={HIDING_PERIOD_MINUTES_MIN}
        max={HIDING_PERIOD_MINUTES_MAX}
        presets={HIDING_PERIOD_PRESET_MINUTES.map((minutes) => ({
          label: `${minutes} min`,
          value: minutes,
        }))}
      />

      <ToggleNumberWithPresets
        enabled={value.customPhotoAnswerDeadlineEnabled}
        onEnabledChange={(customPhotoAnswerDeadlineEnabled) =>
          onChange({ ...value, customPhotoAnswerDeadlineEnabled })
        }
        disabled={disabled}
        toggleLabel="Custom photo answer deadline"
        numberLabel="Photo deadline (minutes)"
        numberValue={value.photoAnswerDeadlineMinutes}
        onNumberChange={(parsed) =>
          onChange({
            ...value,
            photoAnswerDeadlineMinutes: clampPhotoAnswerDeadlineMinutes(parsed),
          })
        }
        min={PHOTO_ANSWER_DEADLINE_MINUTES_MIN}
        max={PHOTO_ANSWER_DEADLINE_MINUTES_MAX}
        presets={PHOTO_ANSWER_DEADLINE_PRESET_MINUTES.map((minutes) => ({
          label: `${minutes} min`,
          value: minutes,
        }))}
      />

      <ToggleNumberWithPresets
        enabled={value.customQuestionAnswerDeadlineEnabled}
        onEnabledChange={(customQuestionAnswerDeadlineEnabled) =>
          onChange({ ...value, customQuestionAnswerDeadlineEnabled })
        }
        disabled={disabled}
        toggleLabel="Custom question answer deadline"
        numberLabel="Question deadline (minutes)"
        numberValue={value.questionAnswerDeadlineMinutes}
        onNumberChange={(parsed) =>
          onChange({
            ...value,
            questionAnswerDeadlineMinutes:
              clampQuestionAnswerDeadlineMinutes(parsed),
          })
        }
        min={QUESTION_ANSWER_DEADLINE_MINUTES_MIN}
        max={QUESTION_ANSWER_DEADLINE_MINUTES_MAX}
        presets={QUESTION_ANSWER_DEADLINE_PRESET_MINUTES.map((minutes) => ({
          label: `${minutes} min`,
          value: minutes,
        }))}
      />
    </div>
  );
}
