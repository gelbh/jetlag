import { Button, Stack } from "@mantine/core";
import type { GameSize } from "@/domain/session/size/gameSize";
import { type AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";
import { AdvancedSessionSettings } from "./AdvancedSessionSettings";
import type { DistanceUnit } from "@/domain/map/distance";
import type { SessionRecord } from "@/domain/map/annotations";
import { ShareCode } from "../identity/ShareCode";
import { RolePasscodeSettings } from "./RolePasscodeSettings";
import {
  IosInsetGroup,
  IosSectionLabel,
  iosFilledStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { sessionRulesSummary } from "@/domain/session/rules";

export interface MapSettingsGameTabProps {
  sessionCode: string;
  remoteSession: boolean;
  isHost: boolean;
  session?: SessionRecord | null;
  myUid?: string;
  distanceUnit: DistanceUnit;
  gameRulesEditable: boolean;
  gameSize: GameSize;
  advancedSettings: AdvancedSessionSettingsValue;
  onAdvancedSettingsChange: (value: AdvancedSessionSettingsValue) => void;
  onSaveGameRules?: () => void | Promise<void>;
  gameRulesSaveLabel: string;
}

export function MapSettingsGameTab({
  sessionCode,
  remoteSession,
  isHost,
  session,
  myUid,
  distanceUnit,
  gameRulesEditable,
  gameSize,
  advancedSettings,
  onAdvancedSettingsChange,
  onSaveGameRules,
  gameRulesSaveLabel,
}: MapSettingsGameTabProps) {
  const summary = sessionRulesSummary({
    gameSize,
    distanceUnit,
    hidingZoneRadiusMeters: advancedSettings.customHidingZoneRadiusEnabled
      ? advancedSettings.hidingZoneRadiusMeters
      : undefined,
    hidingPeriodMinutes: advancedSettings.customHidingPeriodEnabled
      ? advancedSettings.hidingPeriodMinutes
      : undefined,
    photoAnswerDeadlineMinutes:
      advancedSettings.customPhotoAnswerDeadlineEnabled
        ? advancedSettings.photoAnswerDeadlineMinutes
        : undefined,
    questionAnswerDeadlineMinutes:
      advancedSettings.customQuestionAnswerDeadlineEnabled
        ? advancedSettings.questionAnswerDeadlineMinutes
        : undefined,
    disabledTools: advancedSettings.disabledTools,
    tentaclesEnabled: advancedSettings.tentaclesEnabledOverride
      ? true
      : undefined,
    thermometerPresetMeters: advancedSettings.customThermometerPresetsEnabled
      ? advancedSettings.thermometerPresetMeters
      : undefined,
    tentacleMediumRadiusMeters:
      advancedSettings.customTentacleMediumRadiusEnabled
        ? advancedSettings.tentacleMediumRadiusMeters
        : undefined,
    tentacleLargeRadiusMeters:
      advancedSettings.customTentacleLargeRadiusEnabled
        ? advancedSettings.tentacleLargeRadiusMeters
        : undefined,
  });

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <IosSectionLabel>Join code</IosSectionLabel>
        <ShareCode code={sessionCode} remote={remoteSession} />
      </Stack>

      {session && myUid ? (
        <Stack gap="xs">
          <IosSectionLabel>Role passcodes</IosSectionLabel>
          <RolePasscodeSettings
            session={session}
            myUid={myUid}
            isHost={isHost}
            embedded
          />
        </Stack>
      ) : null}

      <Stack gap="xs">
        <IosSectionLabel>Game rules</IosSectionLabel>
        <IosInsetGroup>
          <p className="px-4 py-3 text-sm leading-snug text-[var(--color-field-ink-muted)]">
            {summary.hidingPeriodLabel} · {summary.hidingZoneLabel} ·{" "}
            {summary.tentacleLabel} · {summary.thermometerMaxLabel}
          </p>
        </IosInsetGroup>
        {!gameRulesEditable ? (
          <IosInsetGroup>
            <p className="px-4 py-3 text-sm leading-snug text-[var(--color-field-ink-muted)]">
              Rules lock after the timer starts. Host can edit before start.
            </p>
          </IosInsetGroup>
        ) : null}
        <AdvancedSessionSettings
          gameSize={gameSize}
          distanceUnit={distanceUnit}
          value={advancedSettings}
          onChange={onAdvancedSettingsChange}
          disabled={!gameRulesEditable}
          collapsible={false}
        />
        {gameRulesEditable && onSaveGameRules ? (
          <Button
            fullWidth
            styles={iosFilledStyles}
            onClick={() => void onSaveGameRules()}
          >
            {gameRulesSaveLabel}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
