export interface GroupedSelectOption {
  value: string;
  label: string;
}

export interface GroupedSelectGroup {
  id: string;
  label: string;
  options: readonly GroupedSelectOption[];
}

interface GroupedSelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  groups: readonly GroupedSelectGroup[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ungroupedOptions?: readonly GroupedSelectOption[];
}

export function GroupedSelectField({
  label,
  value,
  placeholder,
  groups,
  onChange,
  disabled = false,
  ungroupedOptions = [],
}: GroupedSelectFieldProps) {
  return (
    <label className="field-label">
      {label}
      <select
        value={value}
        onChange={(event) => {
          if (!event.target.value) {
            return;
          }
          onChange(event.target.value);
        }}
        className="field-input"
        disabled={disabled}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {ungroupedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {groups.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

interface SimpleSelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  options: readonly GroupedSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SimpleSelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
}: SimpleSelectFieldProps) {
  return (
    <label className="field-label">
      {label}
      <select
        value={value}
        onChange={(event) => {
          if (!event.target.value) {
            return;
          }
          onChange(event.target.value);
        }}
        className="field-input"
        disabled={disabled}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
