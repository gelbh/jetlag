import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IncidentMessageRecord,
  IncidentRecord,
} from "../../domain/incident/incidentTypes";
import { isFirebaseConfigured } from "../../services/core/firebase/firebase";
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
  const sendInFlightRef = useRef(false);
  const [syncedIncidentId, setSyncedIncidentId] = useState(
    incidentId ?? null,
  );

  const normalizedIncidentId = incidentId ?? null;
  if (normalizedIncidentId !== syncedIncidentId) {
    setSyncedIncidentId(normalizedIncidentId);
    setIncident(null);
    setMessages([]);
    setError(null);
  }

  const subscribed = Boolean(normalizedIncidentId && isFirebaseConfigured());

  useEffect(() => {
    if (!subscribed || !normalizedIncidentId) {
      return;
    }

    const unsubIncident = subscribeIncident(
      normalizedIncidentId,
      setIncident,
      (nextError) => {
        setError(nextError);
        setIncident(null);
      },
    );

    const unsubMessages = subscribeIncidentMessages(
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

  const sendMessage = useCallback(
    async (text: string) => {
      if (!normalizedIncidentId) {
        throw new Error("No incident selected.");
      }
      if (sendInFlightRef.current) {
        return;
      }
      sendInFlightRef.current = true;
      setSending(true);
      try {
        await postIncidentMessage(normalizedIncidentId, text);
      } finally {
        sendInFlightRef.current = false;
        setSending(false);
      }
    },
    [normalizedIncidentId],
  );

  return {
    incident: subscribed ? incident : null,
    messages: subscribed ? messages : [],
    error: subscribed ? error : null,
    sending,
    sendMessage,
  };
}
