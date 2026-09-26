import { notifications } from "@mantine/notifications";
import type { UserErrorDisplay } from "@/domain/device/feedback/userErrors";

export interface EphemeralPlayerNotification {
  title: string;
  message: string;
  color?: string;
  id?: string;
}

type EphemeralInput = EphemeralPlayerNotification | UserErrorDisplay;

function ephemeralColor(input: EphemeralInput): string {
  return "color" in input && input.color ? input.color : "halt";
}

function ephemeralId(input: EphemeralInput): string {
  return "id" in input && input.id
    ? input.id
    : `ephemeral:${input.title}:${input.message}`;
}

/** Bridge from HUD ephemeral errors to Mantine notifications (channel 1). */
export function showEphemeralPlayerNotification(
  input: EphemeralInput,
): boolean {
  notifications.show({
    id: ephemeralId(input),
    title: input.title,
    message: input.message,
    color: ephemeralColor(input),
    autoClose: 4200,
    withCloseButton: true,
  });
  return true;
}
