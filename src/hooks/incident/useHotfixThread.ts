import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "../../services/core/firebase";
import {
  subscribeHotfixThreadMessages,
  type IncidentThreadMessageRecord,
} from "../../services/firestore/firestoreIncidentThreads";

export interface UseHotfixThreadResult {
  messages: IncidentThreadMessageRecord[];
  error: Error | null;
}

/**
 * Admin-only live hotfix thread (coding-agent status / agent_meta).
 */
export function useHotfixThread(
  incidentId: string | null | undefined,
): UseHotfixThreadResult {
  const [messages, setMessages] = useState<IncidentThreadMessageRecord[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [syncedIncidentId, setSyncedIncidentId] = useState(
    incidentId ?? null,
  );

  const normalizedIncidentId = incidentId ?? null;
  if (normalizedIncidentId !== syncedIncidentId) {
    setSyncedIncidentId(normalizedIncidentId);
    setMessages([]);
    setError(null);
  }

  const subscribed = Boolean(normalizedIncidentId && isFirebaseConfigured());

  useEffect(() => {
    if (!subscribed || !normalizedIncidentId) {
      return;
    }

    return subscribeHotfixThreadMessages(
      normalizedIncidentId,
      setMessages,
      (nextError) => {
        setError(nextError);
        setMessages([]);
      },
    );
  }, [normalizedIncidentId, subscribed]);

  return {
    messages: subscribed ? messages : [],
    error: subscribed ? error : null,
  };
}
