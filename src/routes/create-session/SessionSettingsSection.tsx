import { GameSizePicker } from "../../components/session/identity/GameSizePicker";
import { InsetGroup } from "../../components/ui/entry/entryChrome";
import { InsetHairline } from "../../components/ui/entry/InsetRow";
import { SegmentControl } from "../../components/ui/forms/SegmentControl";
import {
  formatPremiumSessionTierHint,
  type PremiumEntitlements,
} from "../../domain/billing/premiumProducts";
import type { GameArea, SessionTier } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import type { GameSize } from "../../domain/session/size/gameSize";
import type { usePremiumHostEligibility } from "../../hooks/billing/usePremiumHostEligibility";
import { isFirebaseConfigured } from "../../services/core/firebase/firebase";

type VisibleTierOption = ReturnType<typeof usePremiumHostEligibility>["visibleTierOptions"][number];

export interface SessionSettingsSectionProps {
  loading: boolean;
  verifyingAccess: boolean;
  previewGameArea: GameArea | null;
  gameSize: GameSize;
  gameSizeUserOverrode?: boolean;
  distanceUnit: DistanceUnit;
  onGameSizeChange: (size: GameSize) => void;
  onGameSizeUserOverride?: () => void;
  onDistanceUnitChange: (unit: DistanceUnit) => void;
  resolvedSessionTier: SessionTier;
  visibleTierOptions: VisibleTierOption[];
  premiumEntitlements: PremiumEntitlements | null;
  onSessionTierChange: (tier: SessionTier) => void;
  packCreditsLabel: string | null;
  packPremiumFlow: boolean;
}

export function SessionSettingsSection({
  loading,
  verifyingAccess,
  previewGameArea,
  gameSize,
  gameSizeUserOverrode = false,
  distanceUnit,
  onGameSizeChange,
  onGameSizeUserOverride,
  onDistanceUnitChange,
  resolvedSessionTier,
  visibleTierOptions,
  premiumEntitlements,
  onSessionTierChange,
  packCreditsLabel,
  packPremiumFlow,
}: SessionSettingsSectionProps) {
  const busy = loading || verifyingAccess;

  const showTier = isFirebaseConfigured();
  const showPackCredits = packPremiumFlow && Boolean(packCreditsLabel);

  return (
    <>
      <GameSizePicker
        gameArea={previewGameArea}
        value={gameSize}
        distanceUnit={distanceUnit}
        onChange={onGameSizeChange}
        userOverrode={gameSizeUserOverrode}
        onUserOverride={onGameSizeUserOverride}
        disabled={busy}
        compact
        accessory={
          <SegmentControl
            aria-label="Distance edition"
            variant="pill"
            value={distanceUnit}
            onChange={onDistanceUnitChange}
            disabled={busy}
            options={[
              { value: "imperial", label: "Imperial" },
              { value: "metric", label: "Metric" },
            ]}
          />
        }
      />

      {showTier || showPackCredits ? (
        <InsetGroup>
          {showTier ? (
            <div role="radiogroup" aria-label="Session tier">
              {visibleTierOptions.map((option, index) => {
                const tierHint =
                  option.value === "premium"
                    ? formatPremiumSessionTierHint(premiumEntitlements)
                    : null;
                const selected = resolvedSessionTier === option.value;

                return (
                  <div key={option.value}>
                    {index > 0 ? <InsetHairline insetStart="1rem" /> : null}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => onSessionTierChange(option.value)}
                      className={`min-h-12 w-full px-4 py-2.5 text-left disabled:opacity-50 ${
                        selected ? "bg-flag-soft text-flag" : "text-field-ink"
                      }`}
                    >
                      <span className="block text-[1.0625rem] font-medium tracking-[-0.01em]">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-field-ink-muted">
                        {option.summary}
                      </span>
                      {tierHint ? (
                        <span className="mt-1 block text-xs font-semibold text-flag">
                          {tierHint}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
          {showPackCredits ? (
            <p className="px-4 py-2 text-sm font-semibold text-flag">{packCreditsLabel}</p>
          ) : null}
        </InsetGroup>
      ) : null}
    </>
  );
}
