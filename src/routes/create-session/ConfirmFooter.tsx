import { Button } from "../../components/ui/button";
import { InlineError } from "../../components/ui/banners/InlineError";

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
    <div className="shrink-0 border-t border-rule bg-canvas px-4 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <Button
        type="button"
        variant="flag"
        onClick={onConfirm}
        disabled={loading || verifyingAccess || requiresPremiumSignIn}
        className="min-h-14 w-full"
      >
        {confirmLabel}
      </Button>
      {error ? <InlineError className="mt-2">{error}</InlineError> : null}
    </div>
  );
}
