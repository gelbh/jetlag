import { useEffect, useMemo, useRef, useState } from "react";
import {
  allMessageFingerprints,
  baselineAcknowledgedFingerprints,
  chatReadStorageKey,
  collectUnreadFingerprints,
} from "../../domain/device/chatUnread";
import type { SessionMessageRecord } from "../../domain/session/sessionChat";

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
}: UseChatUnreadParams): { hasUnreadChat: boolean; unreadCount: number } {
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
      setAcknowledged(
        storageKey ? loadAcknowledgedFingerprints(storageKey) : new Set(),
      );
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

    const baseline = new Set(
      baselineAcknowledgedFingerprints(messages, viewerUid),
    );
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

  const unreadCount = useMemo(() => {
    if (isChatOpen || !viewerUid) {
      return 0;
    }

    return collectUnreadFingerprints(messages, viewerUid, acknowledged).length;
  }, [acknowledged, isChatOpen, messages, viewerUid]);

  const hasUnreadChat = unreadCount > 0;

  return { hasUnreadChat, unreadCount };
}
