import { AdvancedSessionSettings } from "../../components/session/AdvancedSessionSettings";
import { GameSizePicker } from "../../components/session/GameSizePicker";
import { RolePicker } from "../../components/session/RolePicker";
import {
  formatPremiumSessionTierHint,
  type PremiumEntitlements,
} from "../../domain/billing/premiumProducts";
import type { GameArea, SessionTier } from "../../domain/map/annotations";
import type { AdvancedSessionSettingsValue } from "../../domain/session/advancedSessionSettings";
import type { GameSize } from "../../domain/session/gameSize";
import type { DistanceUnit } from "../../domain/map/distance";
import type { PlayerRole } from "../../domain/session/playerRole";
import { isFirebaseConfigured } from "../../services/core/firebase";
import type { usePremiumHostEligibility } from "../../hooks/billing/usePremiumHostEligibility";

type VisibleTierOption =
  ReturnType<typeof usePremiumHostEligibility>["visibleTierOptions"][number];

export interface SessionSettingsSectionProps {
  loading: boolean;
  verifyingAccess: boolean;
  previewGameArea: GameArea | null;
  playerRole: PlayerRole;
  onPlayerRoleChange: (role: PlayerRole) => void;
  gameSize: GameSize;
  distanceUnit: DistanceUnit;
  advancedSettings: AdvancedSessionSettingsValue;
  onAdvancedSettingsChange: (value: AdvancedSessionSettingsValue) => void;
  onGameSizeChange: (size: GameSize) => void;
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
  playerRole,
  onPlayerRoleChange,
  gameSize,
  distanceUnit,
  advancedSettings,
  onAdvancedSettingsChange,
  onGameSizeChange,
  onDistanceUnitChange,
  resolvedSessionTier,
  visibleTierOptions,
  premiumEntitlements,
  onSessionTierChange,
  packCreditsLabel,
  packPremiumFlow,
}: SessionSettingsSectionProps) {
  return (
    <>
      {isFirebaseConfigured() ? (
        <div className="space-y-2">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
            Session tier
          </p>
          <div
            role="radiogroup"
            aria-label="Session tier"
            className="space-y-1.5"
          >
            {visibleTierOptions.map((option) => {
              const tierHint =
                option.value === "premium"
                  ? formatPremiumSessionTierHint(premiumEntitlements)
                  : null;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={resolvedSessionTier === option.value}
                  disabled={loading || verifyingAccess}
                  onClick={() => onSessionTierChange(option.value)}
                  className={`min-h-12 w-full border-2 px-3 py-2 text-left disabled:opacity-50 ${
                    resolvedSessionTier === option.value
                      ? "border-highlight bg-highlight-soft text-highlight"
                      : "border-border bg-surface-deep text-ink hover:border-brand-blue"
                  }`}
                >
                  <span className="font-display text-sm font-semibold uppercase tracking-wide">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {option.summary}
                  </span>
                  {tierHint ? (
                    <span className="mt-1 block text-xs font-semibold text-highlight">
                      {tierHint}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {packPremiumFlow && packCreditsLabel ? (
        <p className="text-sm font-semibold text-highlight">{packCreditsLabel}</p>
      ) : null}

      <RolePicker
        value={playerRole}
        onChange={onPlayerRoleChange}
        disabled={loading || verifyingAccess}
      />

      <div className="space-y-2">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
          Distance edition
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["imperial", "metric"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              disabled={loading || verifyingAccess}
              onClick={() => onDistanceUnitChange(unit)}
              className={`min-h-11 border-2 px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                distanceUnit === unit
                  ? "border-highlight bg-highlight-soft text-highlight"
                  : "border-border bg-surface-deep text-ink"
              }`}
            >
              {unit === "metric" ? "Metric (km)" : "Imperial (mi)"}
            </button>
          ))}
        </div>
      </div>

      <GameSizePicker
        gameArea={previewGameArea}
        value={gameSize}
        distanceUnit={distanceUnit}
        onChange={onGameSizeChange}
        disabled={loading || verifyingAccess}
      />

      <AdvancedSessionSettings
        gameSize={gameSize}
        distanceUnit={distanceUnit}
        gameArea={previewGameArea}
        value={advancedSettings}
        onChange={onAdvancedSettingsChange}
        disabled={loading || verifyingAccess}
      />
    </>
  );
}
