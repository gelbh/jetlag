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
