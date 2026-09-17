import { useState, type ReactNode } from "react";
import { Button as MantineButton, Stack } from "@mantine/core";
import {
  BookOpen,
  Export,
  Scroll,
  WarningCircle,
} from "@phosphor-icons/react";
import type { NotificationPreferences } from "@/domain/device/chrome/notifications";
import { SettingsToggleRow } from "../settings/SettingsToggleRow";
import { NotificationPreferencesSection } from "./NotificationPreferencesSection";
import {
  IosInsetGroup,
  IosSectionLabel,
} from "@/components/ui/apple/iosEntryChrome";
import { IosInsetRow } from "@/components/ui/apple/IosInsetRow";

const haltQuietRoot = {
  minHeight: "2.875rem",
  borderRadius: 14,
  border: "none",
  fontWeight: 590,
  backgroundColor: "oklch(from var(--color-halt) l c h / 0.16)",
  color: "var(--color-field-ink)",
  "&:hover": {
    backgroundColor: "oklch(from var(--color-halt) l c h / 0.22)",
  },
  "&:disabled": {
    opacity: 0.45,
  },
} as const;

const haltSolidRoot = {
  minHeight: "2.875rem",
  borderRadius: 14,
  border: "none",
  fontWeight: 590,
  backgroundColor: "var(--color-halt)",
  color: "var(--color-field-ink)",
  "&:hover": {
    backgroundColor: "oklch(from var(--color-halt) calc(l + 0.03) c h)",
  },
} as const;

export interface MapSettingsSessionTabProps {
  remoteSession: boolean;
  keepScreenAwake: boolean;
  onKeepScreenAwakeChange: (enabled: boolean) => void;
  lowPowerMode: boolean;
  onLowPowerModeChange: (enabled: boolean) => void;
  notificationPreferences?: NotificationPreferences;
  nativeNotificationsSupported?: boolean;
  onNotificationPreferencesChange?: (
    patch: Partial<NotificationPreferences>,
  ) => void;
  onEnableNotifications?: () => Promise<boolean>;
  onClearMap?: () => void;
  onExport?: () => void;
  isHost: boolean;
  onResetBoard?: () => void;
  onResetSession?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  endGameBlocked?: boolean;
  expansionPackEnabled?: boolean;
  onOpenCurseReference?: () => void;
  onReportProblem?: () => void;
  onReviewMapTools?: () => void;
}

export function MapSettingsSessionTab({
  remoteSession,
  keepScreenAwake,
  onKeepScreenAwakeChange,
  lowPowerMode,
  onLowPowerModeChange,
  notificationPreferences,
  nativeNotificationsSupported = false,
  onNotificationPreferencesChange,
  onEnableNotifications,
  onClearMap,
  onExport,
  isHost,
  onResetBoard,
  onResetSession,
  onEndSession,
  onLeaveSession,
  endGameBlocked = false,
  expansionPackEnabled = false,
  onOpenCurseReference,
  onReportProblem,
  onReviewMapTools,
}: MapSettingsSessionTabProps) {
  const [resetMenuOpen, setResetMenuOpen] = useState(false);

  const helpItems: Array<{
    key: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    tone?: "default" | "halt";
  }> = [];
  if (onReviewMapTools) {
    helpItems.push({
      key: "guide",
      label: "Map tools guide",
      icon: <BookOpen size={20} weight="duotone" />,
      onClick: onReviewMapTools,
    });
  }
  if (onReportProblem) {
    helpItems.push({
      key: "report",
      label: "Report a problem",
      icon: <WarningCircle size={20} weight="duotone" />,
      onClick: onReportProblem,
    });
  }
  if (expansionPackEnabled && onOpenCurseReference) {
    helpItems.push({
      key: "curse",
      label: "Expansion curse reference",
      icon: <Scroll size={20} weight="duotone" />,
      onClick: onOpenCurseReference,
    });
  }
  if (onExport) {
    helpItems.push({
      key: "export",
      label: "Export map",
      icon: <Export size={20} weight="duotone" />,
      onClick: onExport,
    });
  }

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <IosSectionLabel>Device & alerts</IosSectionLabel>
        <IosInsetGroup>
          <SettingsToggleRow
            label="Keep screen awake"
            checked={keepScreenAwake}
            onChange={onKeepScreenAwakeChange}
          />
          <SettingsToggleRow
            showSeparator
            label="Low power mode"
            description="Reduces GPS polling, live transit, animations, and background downloads. Core session sync and tools stay available."
            checked={lowPowerMode}
            onChange={onLowPowerModeChange}
          />
        </IosInsetGroup>
        {nativeNotificationsSupported &&
        notificationPreferences &&
        onNotificationPreferencesChange ? (
          <NotificationPreferencesSection
            preferences={notificationPreferences}
            onChange={onNotificationPreferencesChange}
            onEnableNotifications={onEnableNotifications}
          />
        ) : null}
      </Stack>

      {helpItems.length > 0 ? (
        <Stack gap="xs">
          <IosSectionLabel>Help</IosSectionLabel>
          <IosInsetGroup>
            {helpItems.map((item, index) => (
              <IosInsetRow
                key={item.key}
                label={item.label}
                icon={item.icon}
                onClick={item.onClick}
                showSeparator={index > 0}
                tone={item.tone}
              />
            ))}
          </IosInsetGroup>
        </Stack>
      ) : null}

      <Stack gap="xs">
        <IosSectionLabel>Danger zone</IosSectionLabel>
        {endGameBlocked ? (
          <p className="px-1 text-sm text-[var(--color-field-ink-muted)]">
            Clear map and reset board are unavailable during end game.
          </p>
        ) : null}
        <Stack gap="sm">
          {onClearMap ? (
            <MantineButton
              fullWidth
              styles={{ root: haltQuietRoot }}
              disabled={endGameBlocked}
              onClick={onClearMap}
            >
              Clear map
            </MantineButton>
          ) : null}

          {isHost ? (
            <>
              <MantineButton
                fullWidth
                styles={{ root: haltQuietRoot }}
                aria-expanded={resetMenuOpen}
                onClick={() => setResetMenuOpen((open) => !open)}
              >
                {resetMenuOpen ? "Hide reset options" : "Reset options"}
              </MantineButton>
              {resetMenuOpen ? (
                <IosInsetGroup>
                  <div className="flex flex-col gap-2 p-3">
                    <MantineButton
                      fullWidth
                      styles={{
                        root: { ...haltQuietRoot, minHeight: "2.75rem" },
                      }}
                      disabled={endGameBlocked}
                      onClick={() => {
                        setResetMenuOpen(false);
                        onResetBoard?.();
                      }}
                    >
                      Reset board for everyone
                    </MantineButton>
                    {remoteSession && onResetSession ? (
                      <>
                        <MantineButton
                          fullWidth
                          styles={{
                            root: { ...haltSolidRoot, minHeight: "2.75rem" },
                          }}
                          onClick={() => {
                            setResetMenuOpen(false);
                            void onResetSession();
                          }}
                        >
                          Reset session progress
                        </MantineButton>
                        <p className="text-xs leading-relaxed text-[var(--color-field-ink-muted)]">
                          Keeps the code and roster. Clears timer, map,
                          questions, chat, zones, traps, and end-game state.
                        </p>
                      </>
                    ) : null}
                  </div>
                </IosInsetGroup>
              ) : null}
              <MantineButton
                fullWidth
                styles={{ root: haltSolidRoot }}
                onClick={onEndSession}
              >
                End session for everyone
              </MantineButton>
            </>
          ) : null}

          {onLeaveSession ? (
            <MantineButton
              fullWidth
              styles={{
                root: {
                  minHeight: "2.875rem",
                  borderRadius: 14,
                  border: "none",
                  fontWeight: 590,
                  backgroundColor: "oklch(from var(--color-rule) l c h / 0.45)",
                  color: "var(--color-field-ink)",
                  "&:hover": {
                    backgroundColor: "oklch(from var(--color-rule) l c h / 0.55)",
                  },
                },
              }}
              onClick={onLeaveSession}
            >
              Leave session
            </MantineButton>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
