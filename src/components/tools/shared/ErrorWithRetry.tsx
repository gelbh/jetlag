interface ErrorWithRetryProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorWithRetry({ error, onRetry }: ErrorWithRetryProps) {
  return (
    <div className="space-y-2">
      <p className="text-error">{error}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-secondary text-sm">
          Retry
        </button>
      ) : null}
    </div>
  );
}
