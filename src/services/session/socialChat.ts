import { createMessageId } from "@/domain/session/activity/sessionChat";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { commitWrite } from "@/services/firestore/commitWrite";
import { postSocialMessage } from "@/services/firestore/firestoreSessionExtras";

/**
 * Offline-safe social chat send. The id is minted once per call and is the
 * Firestore doc id, so the SDK replaying the queued write on reconnect rewrites
 * the same doc instead of creating a duplicate. Never await `acknowledged` in
 * UI flows: offline it only settles after reconnect.
 */
export function sendSocialMessage(
  sessionId: string,
  senderUid: string,
  senderRole: PlayerRole,
  text: string,
): { messageId: string; acknowledged: Promise<void> } {
  const messageId = createMessageId();
  const { acknowledged } = commitWrite("chat.send", () =>
    postSocialMessage(sessionId, senderUid, senderRole, text, messageId),
  );
  return { messageId, acknowledged };
}
