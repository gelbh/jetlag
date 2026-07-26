interface SettingsToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingsToggleRowProps) {
  return (
    <label className={`jl-toggle-row ${disabled ? "opacity-50" : ""}`}>
      <span className="min-w-0 flex-1">
        <span className="font-display text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs normal-case leading-snug text-ink-muted">
            {description}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-action"
      />
    </label>
  );
}
