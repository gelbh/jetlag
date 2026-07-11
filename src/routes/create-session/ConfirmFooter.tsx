export interface ConfirmFooterProps {
  confirmLabel: string;
  loading: boolean;
  verifyingAccess: boolean;
  requiresPremiumSignIn: boolean;
  error: string | null;
  onConfirm: () => void;
}

export function ConfirmFooter({
  confirmLabel,
  loading,
  verifyingAccess,
  requiresPremiumSignIn,
  error,
  onConfirm,
}: ConfirmFooterProps) {
  return (
    <div className="sticky bottom-0 shrink-0 border-t border-border bg-surface-deep px-4 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading || verifyingAccess || requiresPremiumSignIn}
        className="btn-primary w-full disabled:opacity-50"
      >
        {confirmLabel}
      </button>
      {error ? <p className="text-error mt-2">{error}</p> : null}
    </div>
  );
}
