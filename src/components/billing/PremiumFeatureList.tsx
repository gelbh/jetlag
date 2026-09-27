import { screenHeaderOffsetClassName } from "../ui/layout/ScreenHeader";

export function PremiumFeatureList({
  entitlementSummary,
  checkoutNotice,
  headerOffset = true,
}: {
  entitlementSummary: string | null;
  checkoutNotice: string | null;
  /** When false, skip fixed ScreenHeader offset (Mantine shells). */
  headerOffset?: boolean;
}) {
  return (
    <div
      className={`space-y-2 ${headerOffset ? screenHeaderOffsetClassName : ""}`}
    >
      <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-ink">
        Premium
      </h1>
      <p className="max-w-sm text-sm leading-snug text-ink-muted">
        Live transit and faster map loads for hosted sessions.
      </p>
      {entitlementSummary ? (
        <p className="premium-entitlement-pill">{entitlementSummary}</p>
      ) : null}
      {checkoutNotice ? (
        <p className="text-sm text-ink-secondary">{checkoutNotice}</p>
      ) : null}
    </div>
  );
}
