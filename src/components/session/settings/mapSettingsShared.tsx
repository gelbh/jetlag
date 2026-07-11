export function ChoicePair<T extends string>({
  left,
  right,
  selected,
  onSelect,
}: {
  left: { value: T; label: string };
  right: { value: T; label: string };
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="jl-choice-pair">
      {[left, right].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={`jl-choice-btn ${
            selected === option.value ? "jl-choice-btn-selected" : ""
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
