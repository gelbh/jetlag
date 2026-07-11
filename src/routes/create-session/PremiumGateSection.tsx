import { Link } from "react-router-dom";
import { PremiumSignInGate } from "../../components/billing/PremiumSignInGate";

export interface PremiumGateSectionProps {
  requiresPremiumSignIn: boolean;
  showPremiumUnlockPanel: boolean;
  showAccessCodeField: boolean;
  accessCode: string;
  accessCodeError: string | null;
  accessCodeExpanded: boolean;
  onAccessCodeChange: (value: string) => void;
  onAccessCodeExpandedChange: (expanded: boolean) => void;
  onPremiumSignedIn: () => void;
}

export function PremiumGateSection({
  requiresPremiumSignIn,
  showPremiumUnlockPanel,
  showAccessCodeField,
  accessCode,
  accessCodeError,
  accessCodeExpanded,
  onAccessCodeChange,
  onAccessCodeExpandedChange,
  onPremiumSignedIn,
}: PremiumGateSectionProps) {
  return (
    <>
      <div
        className={`overflow-hidden motion-safe:transition-[max-height,opacity] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
          showPremiumUnlockPanel || requiresPremiumSignIn
            ? "max-h-56 opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        {requiresPremiumSignIn ? (
          <PremiumSignInGate
            continuePath="/create"
            onSignedIn={onPremiumSignedIn}
          />
        ) : null}
        {showPremiumUnlockPanel ? (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-ink-muted">
              Buy a session pack or subscription to host premium games.
            </p>
            <Link
              to="/premium"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-blue"
            >
              View premium options
            </Link>
            <button
              type="button"
              onClick={() => onAccessCodeExpandedChange(!accessCodeExpanded)}
              className="block text-sm font-semibold text-ink-dim"
            >
              {accessCodeExpanded
                ? "Hide access code"
                : "Have an access code?"}
            </button>
          </div>
        ) : null}
      </div>

      <div
        className={`overflow-hidden motion-safe:transition-[max-height,opacity] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
          showAccessCodeField
            ? "max-h-40 opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
          Host access code
          <input
            value={accessCode}
            onChange={(event) => onAccessCodeChange(event.target.value)}
            type="password"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            className="field-input"
          />
        </label>
        <p className="mt-1 text-xs text-ink-dim">
          Enter once. Friends join with the game code only.
        </p>
        {accessCodeError ? (
          <p className="text-error mt-2">{accessCodeError}</p>
        ) : null}
      </div>
    </>
  );
}
