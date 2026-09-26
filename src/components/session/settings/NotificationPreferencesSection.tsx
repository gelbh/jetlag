import type { NotificationPreferences } from "@/domain/device/chrome/notifications";
import {
  InsetGroup,
  SectionLabel,
} from "@/components/ui/entry/entryChrome";
import { Stack } from "@mantine/core";
import { SettingsToggleRow } from "../settings/SettingsToggleRow";

export function NotificationPreferencesSection({
  preferences,
  onChange,
  onEnableNotifications,
}: {
  preferences: NotificationPreferences;
  onChange: (patch: Partial<NotificationPreferences>) => void;
  onEnableNotifications?: () => Promise<boolean>;
}) {
  const handleMasterToggle = async (enabled: boolean) => {
    if (enabled && onEnableNotifications) {
      const granted = await onEnableNotifications();
      onChange({ enabled: granted });
      return;
    }

    onChange({ enabled });
  };

  return (
    <Stack gap="xs">
      <SectionLabel>Phone alerts</SectionLabel>
      <InsetGroup>
        <SettingsToggleRow
          label="Push notifications"
          description="Alerts when questions arrive, timers change, or chat messages are sent while the app is in the background."
          checked={preferences.enabled}
          onChange={(enabled) => {
            void handleMasterToggle(enabled);
          }}
        />
        <SettingsToggleRow
          showSeparator
          label="New questions"
          checked={preferences.newQuestions}
          onChange={(newQuestions) => onChange({ newQuestions })}
          disabled={!preferences.enabled}
        />
        <SettingsToggleRow
          showSeparator
          label="Timer changes"
          checked={preferences.timerChanges}
          onChange={(timerChanges) => onChange({ timerChanges })}
          disabled={!preferences.enabled}
        />
        <SettingsToggleRow
          showSeparator
          label="Chat messages"
          checked={preferences.chatMessages}
          onChange={(chatMessages) => onChange({ chatMessages })}
          disabled={!preferences.enabled}
        />
        <SettingsToggleRow
          showSeparator
          label="Host confirmations"
          description="When a fix agent needs your OK for a destructive session change."
          checked={preferences.incidentHostConfirm}
          onChange={(incidentHostConfirm) => onChange({ incidentHostConfirm })}
          disabled={!preferences.enabled}
        />
        <SettingsToggleRow
          showSeparator
          label="Live Activities / ongoing alerts"
          description="Lock screen countdown for question deadlines and session timers on supported phones."
          checked={preferences.liveActivities}
          onChange={(liveActivities) => onChange({ liveActivities })}
          disabled={!preferences.enabled}
        />
      </InsetGroup>
    </Stack>
  );
}
