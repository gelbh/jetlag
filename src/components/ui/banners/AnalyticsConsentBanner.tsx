import { Button, Group } from "@mantine/core";
import { useState } from "react";
import { readAnalyticsConsent } from "@/domain/device/consent/analyticsConsent";
import {
  denyAnalyticsConsent,
  grantAnalyticsConsent,
  shouldEnableAnalytics,
} from "@/services/core/analytics/analytics";
import { AppLink } from "../../navigation/AppLink";
import { HudBanner } from "../hud/HudBanner";
import { MapFloatSurface } from "./MapFloatSurface";

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
      <MapFloatSurface
        tone="default"
        role="dialog"
        aria-labelledby="analytics-consent-title"
        aria-describedby="analytics-consent-body"
        className="pointer-events-auto mx-auto max-w-md"
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
        <Group gap="sm" mt="sm" justify="flex-end" wrap="wrap">
          <Button
            type="button"
            variant="default"
            size="compact-md"
            onClick={() => {
              denyAnalyticsConsent();
              setConsent("denied");
            }}
          >
            Decline
          </Button>
          <Button
            type="button"
            variant="filled"
            size="compact-md"
            onClick={() => {
              grantAnalyticsConsent();
              setConsent("granted");
            }}
          >
            Accept
          </Button>
        </Group>
      </MapFloatSurface>
    </HudBanner>
  );
}
