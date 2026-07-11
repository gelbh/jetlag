import { useCopyFeedback } from "../../hooks/useCopyFeedback";

interface ShareCodeProps {
  code: string;
  remote?: boolean;
  compact?: boolean;
}

export function ShareCode({
  code,
  remote = false,
  compact = false,
}: ShareCodeProps) {
  const { status: copyStatus, copy } = useCopyFeedback();

  const handleCopy = async () => {
    await copy(code);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="jl-stamp min-h-12 flex-1 justify-center text-center"
        aria-label={`Copy session code ${code}`}
      >
        <span className="jl-stamp-label">Code</span>
        <span className="jl-stamp-code text-lg">{code}</span>
      </button>
    );
  }

  return (
    <div className="jl-stamp w-full items-center py-3 text-center">
      <span className="jl-stamp-label">Session code</span>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-0.5 w-full"
        aria-label={`Copy session code ${code}`}
      >
        <span className="jl-stamp-code text-3xl tracking-[0.35em]">{code}</span>
      </button>
      <p className="mt-2 text-xs text-ink-dim">
        {copyStatus === "copied"
          ? "Copied to clipboard."
          : copyStatus === "failed"
            ? "Copy failed. Select and copy manually."
            : remote
              ? "Tap code to copy. Give it to your team."
              : "Tap code to copy. Local-only session for solo play."}
      </p>
    </div>
  );
}
