import { useCallback, useEffect, useState } from "react";
import type {
  IncidentMessageRecord,
  IncidentRecord,
} from "../../domain/incident/incidentTypes";
import { isFirebaseConfigured } from "../../services/core/firebase";
import {
  subscribeIncident,
  subscribeIncidentMessages,
} from "../../services/firestore/firestoreIncidents";
import { postIncidentMessage } from "../../services/incident/incidentApi";

export interface UseIncidentThreadResult {
  incident: IncidentRecord | null;
  messages: IncidentMessageRecord[];
  error: Error | null;
  sending: boolean;
  sendMessage: (text: string) => Promise<void>;
}

/**
 * Live incident doc + messages for the player/admin chat thread.
 * Mutations go through callables; Firestore is read-only for clients.
 */
export function useIncidentThread(
  incidentId: string | null | undefined,
): UseIncidentThreadResult {
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [messages, setMessages] = useState<IncidentMessageRecord[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!incidentId || !isFirebaseConfigured()) {
      setIncident(null);
      setMessages([]);
      setError(null);
      return;
    }

    setError(null);

    const unsubIncident = subscribeIncident(
      incidentId,
      setIncident,
      (nextError) => {
        setError(nextError);
        setIncident(null);
      },
    );

    const unsubMessages = subscribeIncidentMessages(
      incidentId,
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
  }, [incidentId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!incidentId) {
        throw new Error("No incident selected.");
      }
      setSending(true);
      try {
        await postIncidentMessage(incidentId, text);
      } finally {
        setSending(false);
      }
    },
    [incidentId],
  );

  return {
    incident,
    messages,
    error,
    sending,
    sendMessage,
  };
}
