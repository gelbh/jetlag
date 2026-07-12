import type { ReactNode } from "react";

interface AdvancedSettingsSectionHeaderProps {
  title: string;
  bordered?: boolean;
}

export function AdvancedSettingsSectionHeader({
  title,
  bordered = false,
}: AdvancedSettingsSectionHeaderProps) {
  return (
    <p
      className={`font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim ${
        bordered ? "border-t border-border pt-3" : ""
      }`}
    >
      {title}
    </p>
  );
}

interface AdvancedSettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: ReactNode;
}

export function AdvancedSettingsToggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: AdvancedSettingsToggleProps) {
  return (
    <label
      className={`flex items-start gap-3 text-sm text-ink ${disabled ? "opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />
      <span>
        <span className="block font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

interface ToggleNumberWithPresetsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  toggleLabel: string;
  toggleDescription?: ReactNode;
  numberLabel: string;
  numberValue: number;
  onNumberChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  inputMode?: "numeric" | "decimal";
  presets: readonly { label: string; value: number }[];
}

export function ToggleNumberWithPresets({
  enabled,
  onEnabledChange,
  disabled = false,
  toggleLabel,
  toggleDescription,
  numberLabel,
  numberValue,
  onNumberChange,
  min,
  max,
  step,
  inputMode = "numeric",
  presets,
}: ToggleNumberWithPresetsProps) {
  return (
    <>
      <AdvancedSettingsToggle
        checked={enabled}
        onChange={onEnabledChange}
        disabled={disabled}
        label={toggleLabel}
        description={toggleDescription}
      />
      {enabled ? (
        <div className="space-y-2">
          <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
            {numberLabel}
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={numberValue}
              disabled={disabled}
              onChange={(event) => {
                const parsed =
                  inputMode === "decimal"
                    ? Number.parseFloat(event.target.value)
                    : Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onNumberChange(parsed);
              }}
              className="field-input mt-2"
              autoComplete="off"
              inputMode={inputMode}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <PresetButton
                key={preset.label}
                label={preset.label}
                disabled={disabled}
                onClick={() => onNumberChange(preset.value)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function SectionSummary({ text }: { text: string }) {
  return <p className="text-xs text-ink-muted">{text}</p>;
}

export function PresetButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand-blue disabled:opacity-50"
    >
      {label}
    </button>
  );
}
