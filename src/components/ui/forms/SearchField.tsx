import type { LoadTask } from "@/services/core/progress/loadTask";
import { LoadProgress } from "../feedback/LoadProgress";
import { TextField } from "./TextField";

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
  /** While loading, shows the search's stage, percent and ETA under the button. */
  task?: LoadTask | null;
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
  task = null,
}: SearchFieldProps) {
  const busy = disabled || loading;

  return (
    <>
      <TextField
        label={label}
        labelClassName={labelClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode="search"
        disabled={busy}
      />
      <button type="button" onClick={onSubmit} disabled={busy} className={submitClassName}>
        {loading ? loadingLabel : submitLabel}
      </button>
      {loading && task ? <LoadProgress task={task} variant="compact" /> : null}
    </>
  );
}
