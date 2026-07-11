interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  loadingLabel?: string;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  labelClassName?: string;
  submitClassName?: string;
}

export function SearchField({
  label,
  value,
  onChange,
  onSubmit,
  submitLabel,
  loadingLabel = "Searching…",
  placeholder,
  loading = false,
  disabled = false,
  labelClassName = "field-label",
  submitClassName = "btn-secondary w-full disabled:opacity-50",
}: SearchFieldProps) {
  const busy = disabled || loading;

  return (
    <>
      <label className={labelClassName}>
        {label}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="field-input"
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          inputMode="search"
          disabled={busy}
        />
      </label>
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className={submitClassName}
      >
        {loading ? loadingLabel : submitLabel}
      </button>
    </>
  );
}
