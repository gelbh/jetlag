import { AdvancedSettingsCategory, AdvancedSettingsInset, AdvancedSettingsToggle } from "./shared";
import type { AdvancedSettingsSectionProps } from "./types";

export function ExpansionPackSection({ value, onChange, disabled }: AdvancedSettingsSectionProps) {
  return (
    <AdvancedSettingsCategory title="Expansion & custom packs" defaultOpen={false}>
      <AdvancedSettingsInset>
        <AdvancedSettingsToggle
          checked={value.expansionPackEnabled}
          disabled={disabled}
          label="Expansion Pack Vol. 1"
          description="Time traps + curse reference"
          onChange={(expansionPackEnabled) => onChange({ ...value, expansionPackEnabled })}
        />
        <AdvancedSettingsToggle
          checked={value.boardEconomyEnabled}
          disabled={disabled}
          label="Simulate hider deck"
          description="Hand, rewards, power-ups"
          showSeparator
          onChange={(boardEconomyEnabled) => onChange({ ...value, boardEconomyEnabled })}
        />
        {value.boardEconomyEnabled ? (
          <p className="px-4 pb-3 text-xs leading-snug text-[var(--color-field-ink-muted)]">
            Host can enable before the hide timer starts. Hiders draw and manage a physical-style
            hand after answering questions.
          </p>
        ) : null}
        <AdvancedSettingsToggle
          checked={value.customQuestionPackEnabled}
          disabled={disabled}
          label="Custom question pack"
          description="7-Eleven, letter zone, major city, etc."
          showSeparator
          onChange={(customQuestionPackEnabled) =>
            onChange({ ...value, customQuestionPackEnabled })
          }
        />
        <AdvancedSettingsToggle
          checked={value.previewQuestionBeforeSend}
          disabled={disabled}
          label="Preview question before send"
          showSeparator
          onChange={(previewQuestionBeforeSend) =>
            onChange({ ...value, previewQuestionBeforeSend })
          }
        />
        {value.expansionPackEnabled ? (
          <p className="px-4 pb-3 text-xs leading-snug text-[var(--color-field-ink-muted)]">
            Time traps on transit stations and a searchable curse reference (30 curses, rules text
            only).
          </p>
        ) : null}
        {value.customQuestionPackEnabled ? (
          <p className="px-4 pb-3 text-xs leading-snug text-[var(--color-field-ink-muted)]">
            Adds matching, measuring, and photo prompts such as 7-Eleven, letter zone, and major
            city.
          </p>
        ) : null}
      </AdvancedSettingsInset>
    </AdvancedSettingsCategory>
  );
}
