import { notifications } from "@mantine/notifications";
import { isPlayerUiMantineEnabled } from "@/hooks/feature/usePlayerUiMantine";

export interface EphemeralPlayerNotification {
  title: string;
  message: string;
  color?: string;
  id?: string;
}

/** Flag-gated bridge from HUD ephemeral errors to Mantine notifications. */
export function showEphemeralPlayerNotification(
  input: EphemeralPlayerNotification,
): boolean {
  if (!isPlayerUiMantineEnabled()) return false;

  notifications.show({
    id: input.id ?? `ephemeral:${input.title}:${input.message}`,
    title: input.title,
    message: input.message,
    color: input.color ?? "red",
  });
  return true;
}
