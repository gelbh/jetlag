import { notifications } from "@mantine/notifications";

export interface EphemeralPlayerNotification {
  title: string;
  message: string;
  color?: string;
  id?: string;
}

/** Bridge from HUD ephemeral errors to Mantine notifications. */
export function showEphemeralPlayerNotification(
  input: EphemeralPlayerNotification,
): boolean {
  notifications.show({
    id: input.id ?? `ephemeral:${input.title}:${input.message}`,
    title: input.title,
    message: input.message,
    color: input.color ?? "red",
    autoClose: 4200,
    withCloseButton: true,
  });
  return true;
}
