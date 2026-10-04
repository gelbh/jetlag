import { GameSizePicker } from "../../components/session/identity/GameSizePicker";
import { RolePicker } from "../../components/session/identity/RolePicker";
import { AdvancedSessionSettings } from "../../components/session/settings/AdvancedSessionSettings";
import { InsetGroup } from "../../components/ui/entry/entryChrome";
import { InsetHairline } from "../../components/ui/entry/InsetRow";
import { SegmentControl } from "../../components/ui/forms/SegmentControl";
import {
  formatPremiumSessionTierHint,
  type PremiumEntitlements,
} from "../../domain/billing/premiumProducts";
import type { GameArea, SessionTier } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import type { GameSize } from "../../domain/session/size/gameSize";
import type { AdvancedSessionSettingsValue } from "../../domain/session/tools/advancedSessionSettings";
import type { usePremiumHostEligibility } from "../../hooks/billing/usePremiumHostEligibility";
import { ANALYTICS_EVENTS, track } from "../../services/core/analytics/analytics";
import { isFirebaseConfigured } from "../../services/core/firebase/firebase";

type VisibleTierOption = ReturnType<typeof usePremiumHostEligibility>["visibleTierOptions"][number];

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
  const handlePlayerRoleChange = (role: PlayerRole) => {
    onPlayerRoleChange(role);
    queueMicrotask(() => {
      track(ANALYTICS_EVENTS.role_selected, { role, surface: "create" });
    });
  };

  const busy = loading || verifyingAccess;

  const showTier = isFirebaseConfigured();
  const showPackCredits = packPremiumFlow && Boolean(packCreditsLabel);

  return (
    <>
      <InsetGroup>
        <div className="space-y-2 px-4 py-3">
          <p className="text-[0.8125rem] font-semibold tracking-[0.04em] text-field-ink-muted uppercase">
            Your side
          </p>
          <RolePicker
            value={playerRole}
            onChange={handlePlayerRoleChange}
            disabled={busy}
            compact
          />
        </div>
      </InsetGroup>

      <InsetGroup>
        <div className="space-y-2 px-4 py-3">
          <p className="text-[0.8125rem] font-semibold tracking-[0.04em] text-field-ink-muted uppercase">
            Distance edition
          </p>
          <SegmentControl
            aria-label="Distance edition"
            value={distanceUnit}
            onChange={onDistanceUnitChange}
            disabled={busy}
            options={[
              { value: "imperial", label: "Imperial" },
              { value: "metric", label: "Metric" },
            ]}
          />
        </div>
      </InsetGroup>

      <InsetGroup>
        <GameSizePicker
          gameArea={previewGameArea}
          value={gameSize}
          distanceUnit={distanceUnit}
          onChange={onGameSizeChange}
          disabled={busy}
          compact
        />
      </InsetGroup>

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

      <InsetGroup>
        <div className="px-4 py-3">
          <AdvancedSessionSettings
            gameSize={gameSize}
            distanceUnit={distanceUnit}
            gameArea={previewGameArea}
            value={advancedSettings}
            onChange={onAdvancedSettingsChange}
            disabled={busy}
          />
        </div>
      </InsetGroup>
    </>
  );
}
