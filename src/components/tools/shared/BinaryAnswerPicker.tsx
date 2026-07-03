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
      <p className="text-sm text-ink-muted">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-12 rounded-xl px-3 text-sm ${
              value === option.value ? option.activeClassName : "bg-surface-raised"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
