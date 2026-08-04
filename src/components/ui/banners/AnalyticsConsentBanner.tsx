import { useState } from "react";
import { readAnalyticsConsent } from "@/domain/device/consent/analyticsConsent";
import {
  denyAnalyticsConsent,
  grantAnalyticsConsent,
  shouldEnableAnalytics,
} from "@/services/core/analytics/analytics";
import { AppLink } from "../../navigation/AppLink";
import { HudBanner } from "../hud/HudBanner";

export function AnalyticsConsentBanner() {
  const [consent, setConsent] = useState(readAnalyticsConsent);

  const analyticsUiEnabled = shouldEnableAnalytics({
    prod: import.meta.env.PROD,
    mode: import.meta.env.MODE,
  });
  if (!analyticsUiEnabled || consent !== "unset") {
    return null;
  }

  return (
    <HudBanner
      visible
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-banner)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div
        className="pointer-events-auto hud-panel mx-auto flex max-w-md flex-col gap-2 px-3 py-2.5"
        role="dialog"
        aria-labelledby="analytics-consent-title"
        aria-describedby="analytics-consent-body"
      >
        <p
          id="analytics-consent-title"
          className="font-display text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Analytics
        </p>
        <p
          id="analytics-consent-body"
          className="text-pretty text-sm leading-snug text-ink-muted"
        >
          Optional product analytics (PostHog). After Accept, an analytics ID
          may be stored on this device and linked if you sign in.{" "}
          <AppLink to="/privacy" className="underline">
            Privacy
          </AppLink>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-secondary min-h-11 px-4 text-xs"
            onClick={() => {
              denyAnalyticsConsent();
              setConsent("denied");
            }}
          >
            Decline
          </button>
          <button
            type="button"
            className="btn-primary min-h-11 px-4 text-xs"
            onClick={() => {
              grantAnalyticsConsent();
              setConsent("granted");
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </HudBanner>
  );
}
