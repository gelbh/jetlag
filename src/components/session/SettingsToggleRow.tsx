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
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-hud-md)] bg-surface-raised px-4 text-sm text-ink">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-action"
      />
    </label>
  );
}
