/**
 * Shared support-thread persistence for session-ops (turn enqueue + MCP + poller).
 */

import { randomUUID } from "node:crypto";

export const SUPPORT_AGENT_WORKING_TEXT =
  "Working on your request… I will post an update here when ready.";

/**
 * Minimal support-thread write (and desk message mirror for ops_agent/system/chat).
 *
 * @param db
 * @param {string} incidentId
 * @param {object} message
 * @param {() => string} [generateId]
 */
export async function appendSupportThreadMessage(
  db,
  incidentId,
  message,
  generateId = () => randomUUID(),
) {
  const messageId = generateId();
  const payload = {
    id: messageId,
    ...message,
  };

  const threadRef = db
    .collection("incidents")
    .doc(incidentId)
    .collection("threads")
    .doc("support")
    .collection("messages")
    .doc(messageId);

  await threadRef.set(payload);

  if (
    payload.sender === "ops_agent" ||
    payload.sender === "system" ||
    payload.kind === "chat"
  ) {
    await db
      .collection("incidents")
      .doc(incidentId)
      .collection("messages")
      .doc(messageId)
      .set({
        sender: payload.sender,
        senderUid: payload.senderUid ?? null,
        kind: payload.kind ?? "chat",
        text: payload.text ?? "",
        createdAt: payload.createdAt,
        toolCall: payload.toolCall ?? null,
        working: payload.working === true,
      });
  }

  return { messageId };
}
