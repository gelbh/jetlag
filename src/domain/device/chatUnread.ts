import type { SessionMessageRecord } from "../session/sessionChat";

export function messageFingerprint(message: SessionMessageRecord): string {
  return `${message.id}|${message.status ?? ""}|${message.selectedReply ?? ""}`;
}

export function isUnreadEligibleMessage(
  message: SessionMessageRecord,
  viewerUid: string,
): boolean {
  if (message.channel === "game" && message.kind === "system") {
    return false;
  }

  if (message.channel === "social") {
    return message.senderUid !== viewerUid;
  }

  if (message.channel === "game" && message.kind === "question") {
    const answered =
      message.status === "answered" ||
      message.status === "resolved" ||
      message.selectedReply !== undefined;

    if (answered) {
      return message.senderUid === viewerUid;
    }

    return message.senderUid !== viewerUid;
  }

  return false;
}

export function collectUnreadFingerprints(
  messages: readonly SessionMessageRecord[],
  viewerUid: string,
  acknowledged: ReadonlySet<string>,
): string[] {
  const unread: string[] = [];

  for (const message of messages) {
    if (!isUnreadEligibleMessage(message, viewerUid)) {
      continue;
    }

    const fingerprint = messageFingerprint(message);
    if (!acknowledged.has(fingerprint)) {
      unread.push(fingerprint);
    }
  }

  return unread;
}

export function hasUnreadChatMessages(
  messages: readonly SessionMessageRecord[],
  viewerUid: string,
  acknowledged: ReadonlySet<string>,
): boolean {
  return collectUnreadFingerprints(messages, viewerUid, acknowledged).length > 0;
}

export function allMessageFingerprints(
  messages: readonly SessionMessageRecord[],
): string[] {
  return messages.map((message) => messageFingerprint(message));
}

export function baselineAcknowledgedFingerprints(
  messages: readonly SessionMessageRecord[],
  viewerUid: string,
): string[] {
  return messages
    .filter((message) => !isUnreadEligibleMessage(message, viewerUid))
    .map((message) => messageFingerprint(message));
}

export function chatReadStorageKey(
  sessionId: string,
  viewerUid: string,
): string {
  return `jetlag-chat-read:${sessionId}:${viewerUid}`;
}
