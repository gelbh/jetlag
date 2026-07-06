interface SettingsToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsToggleRow({
  label,
  checked,
  onChange,
}: SettingsToggleRowProps) {
  return (
    <label className="jl-toggle-row">
      <span className="font-display text-xs font-semibold uppercase tracking-wide">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-action"
      />
    </label>
  );
}
