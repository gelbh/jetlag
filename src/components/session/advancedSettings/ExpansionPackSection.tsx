import type { AdvancedSettingsSectionProps } from "./types";

export function ExpansionPackSection({
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  return (
    <fieldset
      disabled={disabled}
      className="space-y-3 rounded-[var(--radius-hud-md)] border border-border p-3 disabled:opacity-50"
    >
      <legend className="px-1 font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
        Expansion & custom packs
      </legend>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={value.expansionPackEnabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              expansionPackEnabled: event.target.checked,
            })
          }
          className="h-4 w-4"
        />
        <span className="text-sm text-ink-secondary">
          Expansion Pack Vol. 1 (time traps + curse reference)
        </span>
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={value.customQuestionPackEnabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              customQuestionPackEnabled: event.target.checked,
            })
          }
          className="h-4 w-4"
        />
        <span className="text-sm text-ink-secondary">
          Custom question pack (7-Eleven, letter zone, major city, etc.)
        </span>
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={value.previewQuestionBeforeSend}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              previewQuestionBeforeSend: event.target.checked,
            })
          }
          className="h-4 w-4"
        />
        <span className="text-sm text-ink-secondary">
          Preview question before send
        </span>
      </label>
      {value.expansionPackEnabled ? (
        <div className="rounded-[var(--radius-hud-md)] border border-border bg-surface-raised px-3 py-2 text-xs text-ink-muted">
          <p className="font-semibold text-ink-secondary">
            Expansion Pack Vol. 1
          </p>
          <p className="mt-1">
            Time traps on transit stations and a searchable curse reference (30
            curses, rules text only).
          </p>
        </div>
      ) : null}
      {value.customQuestionPackEnabled ? (
        <div className="rounded-[var(--radius-hud-md)] border border-border bg-surface-raised px-3 py-2 text-xs text-ink-muted">
          <p className="font-semibold text-ink-secondary">Custom question pack</p>
          <p className="mt-1">
            Adds matching, measuring, and photo prompts such as 7-Eleven, letter
            zone, and major city.
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
