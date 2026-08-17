import { Button } from "../../components/ui/button";

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
    <div className="sticky bottom-0 shrink-0 border-t border-rule bg-canvas px-4 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <Button
        type="button"
        variant="flag"
        onClick={onConfirm}
        disabled={loading || verifyingAccess || requiresPremiumSignIn}
        className="home-entry-action min-h-14 w-full"
      >
        {confirmLabel}
      </Button>
      {error ? <p className="mt-2 text-halt">{error}</p> : null}
    </div>
  );
}
