import { useEffect, useMemo, useRef, useState } from "react";
import {
  allMessageFingerprints,
  chatReadStorageKey,
  hasUnreadChatMessages,
} from "../domain/chatUnread";
import type { SessionMessageRecord } from "../domain/sessionChat";

interface UseChatUnreadParams {
  sessionId: string | undefined;
  viewerUid: string | undefined;
  messages: readonly SessionMessageRecord[];
  isChatOpen: boolean;
}

function loadAcknowledgedFingerprints(storageKey: string): Set<string> {
  if (typeof sessionStorage === "undefined") {
    return new Set();
  }

  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      return new Set();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function saveAcknowledgedFingerprints(
  storageKey: string,
  acknowledged: ReadonlySet<string>,
): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem(storageKey, JSON.stringify([...acknowledged]));
}

export function useChatUnread({
  sessionId,
  viewerUid,
  messages,
  isChatOpen,
}: UseChatUnreadParams): { hasUnreadChat: boolean } {
  const storageKey =
    sessionId && viewerUid
      ? chatReadStorageKey(sessionId, viewerUid)
      : null;

  const [acknowledged, setAcknowledged] = useState<Set<string>>(() =>
    storageKey ? loadAcknowledgedFingerprints(storageKey) : new Set(),
  );
  const baselinedRef = useRef(false);
  const prevStorageKeyRef = useRef(storageKey);

  useEffect(() => {
    if (storageKey !== prevStorageKeyRef.current) {
      prevStorageKeyRef.current = storageKey;
      baselinedRef.current = false;
      /* eslint-disable react-hooks/set-state-in-effect -- reload acknowledged state for new session */
      setAcknowledged(
        storageKey ? loadAcknowledgedFingerprints(storageKey) : new Set(),
      );
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !viewerUid || messages.length === 0 || baselinedRef.current) {
      return;
    }

    if (acknowledged.size > 0) {
      baselinedRef.current = true;
      return;
    }

    const baseline = new Set(allMessageFingerprints(messages));
    baselinedRef.current = true;
    /* eslint-disable react-hooks/set-state-in-effect -- baseline historical messages on first snapshot */
    setAcknowledged(baseline);
    /* eslint-enable react-hooks/set-state-in-effect */
    saveAcknowledgedFingerprints(storageKey, baseline);
  }, [acknowledged.size, messages, storageKey, viewerUid]);

  useEffect(() => {
    if (!isChatOpen || !storageKey || messages.length === 0) {
      return;
    }

    const nextAcknowledged = new Set(allMessageFingerprints(messages));
    /* eslint-disable react-hooks/set-state-in-effect -- mark messages read when chat opens */
    setAcknowledged(nextAcknowledged);
    /* eslint-enable react-hooks/set-state-in-effect */
    saveAcknowledgedFingerprints(storageKey, nextAcknowledged);
  }, [isChatOpen, messages, storageKey]);

  const hasUnreadChat = useMemo(() => {
    if (isChatOpen || !viewerUid) {
      return false;
    }

    return hasUnreadChatMessages(messages, viewerUid, acknowledged);
  }, [acknowledged, isChatOpen, messages, viewerUid]);

  return { hasUnreadChat };
}
