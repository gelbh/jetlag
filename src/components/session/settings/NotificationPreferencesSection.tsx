import type { NotificationPreferences } from "../../../domain/device/notifications";
import { SettingsToggleRow } from "../SettingsToggleRow";

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
    <div className="space-y-3 border-t-2 border-border pt-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-blue">
        Phone alerts
      </p>
      <SettingsToggleRow
        label="Push notifications"
        description="Alerts when questions arrive, timers change, or chat messages are sent while the app is in the background."
        checked={preferences.enabled}
        onChange={(enabled) => {
          void handleMasterToggle(enabled);
        }}
      />
      <SettingsToggleRow
        label="New questions"
        checked={preferences.newQuestions}
        onChange={(newQuestions) => onChange({ newQuestions })}
        disabled={!preferences.enabled}
      />
      <SettingsToggleRow
        label="Timer changes"
        checked={preferences.timerChanges}
        onChange={(timerChanges) => onChange({ timerChanges })}
        disabled={!preferences.enabled}
      />
      <SettingsToggleRow
        label="Chat messages"
        checked={preferences.chatMessages}
        onChange={(chatMessages) => onChange({ chatMessages })}
        disabled={!preferences.enabled}
      />
      <SettingsToggleRow
        label="Live Activities / ongoing alerts"
        description="Lock screen countdown for question deadlines and session timers on supported phones."
        checked={preferences.liveActivities}
        onChange={(liveActivities) => onChange({ liveActivities })}
        disabled={!preferences.enabled}
      />
    </div>
  );
}
