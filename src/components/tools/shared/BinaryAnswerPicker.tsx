interface BinaryAnswerOption<Value extends string> {
  value: Value;
  label: string;
  activeClassName: string;
}

interface BinaryAnswerPickerProps<Value extends string> {
  value: Value | null;
  options: readonly [BinaryAnswerOption<Value>, BinaryAnswerOption<Value>];
  onChange: (value: Value) => void;
  label?: string;
}

export function BinaryAnswerPicker<Value extends string>({
  value,
  options,
  onChange,
  label = "Answer",
}: BinaryAnswerPickerProps<Value>) {
  return (
    <div className="space-y-2">
      {label ? <p className="field-label m-0">{label}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`min-h-12 rounded-[var(--radius-hud-md)] px-3 text-sm font-medium ${
              value === option.value
                ? option.activeClassName
                : "bg-surface-raised text-ink-secondary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
