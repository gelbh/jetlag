import { InlineError } from "../../ui/InlineError";

interface ErrorWithRetryProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorWithRetry({ error, onRetry }: ErrorWithRetryProps) {
  return (
    <div className="jl-selectable space-y-2">
      <InlineError>{error}</InlineError>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-secondary text-sm">
          Retry
        </button>
      ) : null}
    </div>
  );
}
