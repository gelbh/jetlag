import { useCallback, useEffect, useState } from "react";
import type { IncidentRecord } from "../../domain/incident/incidentTypes";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { subscribeIncident } from "../../services/firestore/firestoreIncidents";
import {
  subscribeSupportThreadMessages,
  type IncidentThreadMessageRecord,
} from "../../services/firestore/firestoreIncidentThreads";
import { postSupportAgentTurn } from "../../services/incident/incidentApi";

export interface UseSupportThreadResult {
  incident: IncidentRecord | null;
  messages: IncidentThreadMessageRecord[];
  error: Error | null;
  sending: boolean;
  summonId: string | null;
  sendTurn: (text: string) => Promise<void>;
}

/**
 * Live support thread (player ↔ session-ops agent ± admin) + incident doc.
 * Mutations go through `postSupportAgentTurn`; Firestore is read-only.
 */
export function useSupportThread(
  incidentId: string | null | undefined,
): UseSupportThreadResult {
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [messages, setMessages] = useState<IncidentThreadMessageRecord[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);
  const [summonId, setSummonId] = useState<string | null>(null);
  const [syncedIncidentId, setSyncedIncidentId] = useState(
    incidentId ?? null,
  );

  const normalizedIncidentId = incidentId ?? null;
  if (normalizedIncidentId !== syncedIncidentId) {
    setSyncedIncidentId(normalizedIncidentId);
    setIncident(null);
    setMessages([]);
    setError(null);
    setSummonId(null);
  }

  const subscribed = Boolean(normalizedIncidentId && isFirebaseConfigured());

  useEffect(() => {
    if (!subscribed || !normalizedIncidentId) {
      return;
    }

    const unsubIncident = subscribeIncident(
      normalizedIncidentId,
      (next) => {
        setIncident(next);
        if (next?.activeSessionOpsSummonId) {
          setSummonId(next.activeSessionOpsSummonId);
        }
      },
      (nextError) => {
        setError(nextError);
        setIncident(null);
      },
    );

    const unsubMessages = subscribeSupportThreadMessages(
      normalizedIncidentId,
      setMessages,
      (nextError) => {
        setError(nextError);
        setMessages([]);
      },
    );

    return () => {
      unsubIncident();
      unsubMessages();
    };
  }, [normalizedIncidentId, subscribed]);

  const sendTurn = useCallback(
    async (text: string) => {
      if (!normalizedIncidentId) {
        throw new Error("No incident selected.");
      }
      setSending(true);
      try {
        const result = await postSupportAgentTurn(
          normalizedIncidentId,
          text,
          summonId,
        );
        if (result.summonId) {
          setSummonId(result.summonId);
        }
      } finally {
        setSending(false);
      }
    },
    [normalizedIncidentId, summonId],
  );

  return {
    incident: subscribed ? incident : null,
    messages: subscribed ? messages : [],
    error: subscribed ? error : null,
    sending,
    summonId,
    sendTurn,
  };
}
