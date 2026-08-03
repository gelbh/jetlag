export interface RoleCodeStampProps {
  roleLabel: string;
  code: string | null;
  busy?: boolean;
  onReveal: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
}

const MASKED_CODE = "••••";

export function RoleCodeStamp({
  roleLabel,
  code,
  busy = false,
  onReveal,
  onRegenerate,
  onCopy,
}: RoleCodeStampProps) {
  const revealed = code != null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (revealed) {
            onCopy();
            return;
          }
          onReveal();
        }}
        className="jl-stamp w-full items-center py-2 text-center"
        aria-label={
          revealed ? `Copy ${roleLabel}` : `Reveal ${roleLabel}`
        }
      >
        <span className="jl-stamp-label">{roleLabel}</span>
        <span className="jl-stamp-code text-lg tracking-[0.2em]">
          {revealed ? code : MASKED_CODE}
        </span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onRegenerate}
        className="btn-secondary min-h-11 w-full"
        aria-label={`Regenerate ${roleLabel}`}
      >
        Regenerate
      </button>
    </div>
  );
}
